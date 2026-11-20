from datetime import UTC, datetime, timedelta

import pytest

from app.domain.models import Game, LibraryEntry, LibraryStatus, Review, ScoringWeights
from app.domain.scoring import (
    average_ratings,
    genre_affinity,
    normalize_rating,
    rank_games,
    score_for_user,
    similar_games,
    weighted_rating,
)

NOW = datetime(2026, 11, 16, 12, 0, tzinfo=UTC)

RPG_A = Game(id="rpg-a", title="Alpha Quest", genre="RPG", developer="Studio X")
RPG_B = Game(id="rpg-b", title="Beta Saga", genre="rpg", developer="Studio Y")
SHOOTER = Game(id="shooter", title="Crossfire", genre="Shooter", developer="Studio X")
PUZZLE = Game(id="puzzle", title="Dot Logic", genre="Puzzle", developer="Studio Z")
NO_GENRE = Game(id="no-genre", title="Echo", genre=None)


def review(game_id: str, rating: int, user_id: str = "u1", days_ago: int = 0) -> Review:
    return Review(
        user_id=user_id,
        game_id=game_id,
        rating=rating,
        created_at=NOW - timedelta(days=days_ago),
    )


class TestNormalizeRating:
    def test_maps_lowest_rating_to_zero(self) -> None:
        assert normalize_rating(1) == 0.0

    def test_maps_highest_rating_to_one(self) -> None:
        assert normalize_rating(10) == 1.0

    def test_maps_middle_rating_proportionally(self) -> None:
        assert normalize_rating(5.5) == pytest.approx(0.5)


class TestAverageRatings:
    def test_returns_mean_per_game(self) -> None:
        result = average_ratings([review("a", 8), review("a", 6), review("b", 10)])

        assert result == {"a": 7.0, "b": 10.0}

    def test_returns_empty_mapping_without_reviews(self) -> None:
        assert average_ratings([]) == {}


class TestGenreAffinity:
    def test_favourite_genre_gets_full_affinity(self) -> None:
        games = {g.id: g for g in (RPG_A, RPG_B, SHOOTER)}
        library = [
            LibraryEntry("rpg-a", LibraryStatus.COMPLETED),
            LibraryEntry("rpg-b", LibraryStatus.PLAYING),
            LibraryEntry("shooter", LibraryStatus.PLAN_TO_PLAY),
        ]

        assert genre_affinity(library, games) == {"rpg": 1.0, "shooter": 0.5}

    def test_disliked_games_cancel_out_genre(self) -> None:
        games = {g.id: g for g in (RPG_A, RPG_B)}
        library = [
            LibraryEntry("rpg-a", LibraryStatus.COMPLETED),
            LibraryEntry("rpg-b", LibraryStatus.DISLIKED),
        ]

        assert genre_affinity(library, games) == {}

    def test_ignores_unknown_games_and_games_without_genre(self) -> None:
        games = {NO_GENRE.id: NO_GENRE}
        library = [
            LibraryEntry("no-genre", LibraryStatus.COMPLETED),
            LibraryEntry("missing", LibraryStatus.COMPLETED),
        ]

        assert genre_affinity(library, games) == {}


class TestScoreForUser:
    def test_excludes_games_already_in_library_including_disliked(self) -> None:
        library = [
            LibraryEntry("rpg-a", LibraryStatus.COMPLETED),
            LibraryEntry("shooter", LibraryStatus.DISLIKED),
        ]

        result = score_for_user(
            games=[RPG_A, RPG_B, SHOOTER, PUZZLE],
            library=library,
            friend_reviews=[],
            all_reviews=[],
            weights=ScoringWeights(),
            limit=10,
        )

        assert {s.game.id for s in result} == {"rpg-b", "puzzle"}

    def test_combines_genre_friends_and_global_components(self) -> None:
        result = score_for_user(
            games=[RPG_A, RPG_B],
            library=[LibraryEntry("rpg-a", LibraryStatus.COMPLETED)],
            friend_reviews=[review("rpg-b", 10, user_id="friend")],
            all_reviews=[review("rpg-b", 10), review("rpg-b", 1)],
            weights=ScoringWeights(genre=0.4, friends=0.4, global_rating=0.2),
            limit=10,
        )

        assert len(result) == 1
        assert result[0].score == pytest.approx(0.4 * 1.0 + 0.4 * 1.0 + 0.2 * 0.5)
        assert result[0].reasons == (
            "Combina com um gênero que você curte: rpg",
            "Seus amigos deram nota média 10.0",
            "Nota média da comunidade: 5.5",
        )

    def test_orders_by_score_then_title_and_respects_limit(self) -> None:
        result = score_for_user(
            games=[PUZZLE, SHOOTER, RPG_B],
            library=[],
            friend_reviews=[],
            all_reviews=[review("rpg-b", 10), review("puzzle", 4)],
            weights=ScoringWeights(),
            limit=2,
        )

        assert [s.game.id for s in result] == ["rpg-b", "puzzle"]

    def test_games_without_signals_score_zero_and_sort_by_title(self) -> None:
        result = score_for_user(
            games=[SHOOTER, PUZZLE],
            library=[],
            friend_reviews=[],
            all_reviews=[],
            weights=ScoringWeights(),
            limit=10,
        )

        assert [(s.game.id, s.score, s.reasons) for s in result] == [
            ("shooter", 0.0, ()),
            ("puzzle", 0.0, ()),
        ]


class TestSimilarGames:
    def test_ranks_same_genre_and_developer_highest(self) -> None:
        candidate_same_genre_and_dev = Game(
            id="rpg-c", title="Gamma", genre="RPG", developer="Studio X"
        )

        result = similar_games(
            target=RPG_A,
            games=[RPG_A, RPG_B, SHOOTER, PUZZLE, candidate_same_genre_and_dev],
            all_reviews=[],
            limit=10,
        )

        assert [s.game.id for s in result] == ["rpg-c", "rpg-b", "shooter"]

    def test_rating_proximity_breaks_ties(self) -> None:
        close = Game(id="close", title="Close", genre="RPG")
        far = Game(id="far", title="Far", genre="RPG")

        result = similar_games(
            target=RPG_A,
            games=[far, close],
            all_reviews=[review("rpg-a", 8), review("close", 8), review("far", 1)],
            limit=10,
        )

        assert [s.game.id for s in result] == ["close", "far"]
        assert result[0].score == pytest.approx(0.5 + 0.3)

    def test_never_includes_target_or_unrelated_games(self) -> None:
        result = similar_games(target=PUZZLE, games=[PUZZLE, RPG_A], all_reviews=[], limit=10)

        assert result == []


class TestWeightedRating:
    def test_few_votes_are_pulled_toward_global_mean(self) -> None:
        assert weighted_rating(rating_sum=10, count=1, global_mean=6.0, min_votes=3) == 7.0

    def test_without_min_votes_returns_plain_average(self) -> None:
        assert weighted_rating(rating_sum=27, count=3, global_mean=5.0, min_votes=0) == 9.0


class TestRankGames:
    def test_single_perfect_review_does_not_beat_many_good_reviews(self) -> None:
        reviews = (
            [review("rpg-a", 10)]
            + [review("rpg-b", 9, user_id=f"u{i}") for i in range(6)]
            + [review("puzzle", 2, user_id=f"u{i}") for i in range(4)]
        )

        result = rank_games(
            games=[RPG_A, RPG_B, PUZZLE],
            reviews=reviews,
            now=NOW,
            days=None,
            min_votes=3,
            limit=10,
        )

        assert [r.game.id for r in result] == ["rpg-b", "rpg-a", "puzzle"]
        assert result[1].average_rating == 10.0
        assert result[1].review_count == 1

    def test_ignores_reviews_outside_time_window(self) -> None:
        reviews = [review("rpg-a", 9, days_ago=1), review("rpg-b", 10, days_ago=30)]

        result = rank_games(
            games=[RPG_A, RPG_B], reviews=reviews, now=NOW, days=7, min_votes=0, limit=10
        )

        assert [r.game.id for r in result] == ["rpg-a"]

    def test_treats_naive_timestamps_as_utc(self) -> None:
        naive = Review(user_id="u", game_id="rpg-a", rating=7, created_at=datetime(2026, 11, 15))

        result = rank_games(games=[RPG_A], reviews=[naive], now=NOW, days=7, min_votes=0, limit=10)

        assert result[0].weighted_rating == 7.0

    def test_returns_empty_without_reviews(self) -> None:
        assert rank_games(games=[RPG_A], reviews=[], now=NOW, days=None, min_votes=3, limit=5) == []
