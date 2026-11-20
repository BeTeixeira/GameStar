from collections import defaultdict
from collections.abc import Iterable, Mapping, Sequence
from datetime import UTC, datetime, timedelta

from app.domain.models import (
    Game,
    LibraryEntry,
    LibraryStatus,
    RankedGame,
    Review,
    ScoredGame,
    ScoringWeights,
)

MIN_RATING = 1
MAX_RATING = 10

SIMILAR_GENRE_WEIGHT = 0.5
SIMILAR_DEVELOPER_WEIGHT = 0.2
SIMILAR_RATING_WEIGHT = 0.3


def normalize_text(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    return value.strip().lower()


def normalize_rating(rating: float) -> float:
    return (rating - MIN_RATING) / (MAX_RATING - MIN_RATING)


def average_ratings(reviews: Iterable[Review]) -> dict[str, float]:
    totals: dict[str, list[int]] = defaultdict(list)
    for review in reviews:
        totals[review.game_id].append(review.rating)
    return {game_id: sum(ratings) / len(ratings) for game_id, ratings in totals.items()}


def genre_affinity(
    library: Iterable[LibraryEntry], games_by_id: Mapping[str, Game]
) -> dict[str, float]:
    balance: dict[str, int] = defaultdict(int)
    for entry in library:
        game = games_by_id.get(entry.game_id)
        genre = normalize_text(game.genre) if game else None
        if genre is None:
            continue
        balance[genre] += -1 if entry.status is LibraryStatus.DISLIKED else 1

    peak = max((count for count in balance.values() if count > 0), default=0)
    if peak == 0:
        return {}
    return {genre: count / peak for genre, count in balance.items() if count > 0}


def score_for_user(
    games: Sequence[Game],
    library: Sequence[LibraryEntry],
    friend_reviews: Sequence[Review],
    all_reviews: Sequence[Review],
    weights: ScoringWeights,
    limit: int,
) -> list[ScoredGame]:
    games_by_id = {game.id: game for game in games}
    owned_ids = {entry.game_id for entry in library}
    affinity = genre_affinity(library, games_by_id)
    friend_average = average_ratings(friend_reviews)
    global_average = average_ratings(all_reviews)

    scored: list[ScoredGame] = []
    for game in games:
        if game.id in owned_ids:
            continue

        reasons: list[str] = []
        genre = normalize_text(game.genre)
        genre_component = affinity.get(genre, 0.0) if genre else 0.0
        if genre_component > 0:
            reasons.append(f"Combina com um gênero que você curte: {game.genre}")

        friends_component = 0.0
        if game.id in friend_average:
            friends_component = normalize_rating(friend_average[game.id])
            reasons.append(f"Seus amigos deram nota média {friend_average[game.id]:.1f}")

        global_component = 0.0
        if game.id in global_average:
            global_component = normalize_rating(global_average[game.id])
            reasons.append(f"Nota média da comunidade: {global_average[game.id]:.1f}")

        score = (
            weights.genre * genre_component
            + weights.friends * friends_component
            + weights.global_rating * global_component
        )
        scored.append(ScoredGame(game=game, score=round(score, 4), reasons=tuple(reasons)))

    scored.sort(key=lambda item: (-item.score, item.game.title.lower()))
    return scored[:limit]


def similar_games(
    target: Game, games: Sequence[Game], all_reviews: Sequence[Review], limit: int
) -> list[ScoredGame]:
    averages = average_ratings(all_reviews)
    target_genre = normalize_text(target.genre)
    target_developer = normalize_text(target.developer)
    target_average = averages.get(target.id)

    scored: list[ScoredGame] = []
    for game in games:
        if game.id == target.id:
            continue

        reasons: list[str] = []
        score = 0.0
        if target_genre and normalize_text(game.genre) == target_genre:
            score += SIMILAR_GENRE_WEIGHT
            reasons.append(f"Mesmo gênero: {game.genre}")
        if target_developer and normalize_text(game.developer) == target_developer:
            score += SIMILAR_DEVELOPER_WEIGHT
            reasons.append(f"Mesma desenvolvedora: {game.developer}")
        if score == 0:
            continue

        game_average = averages.get(game.id)
        if target_average is not None and game_average is not None:
            distance = abs(target_average - game_average) / (MAX_RATING - MIN_RATING)
            score += SIMILAR_RATING_WEIGHT * (1 - distance)
            reasons.append(f"Nota média parecida: {game_average:.1f}")

        scored.append(ScoredGame(game=game, score=round(score, 4), reasons=tuple(reasons)))

    scored.sort(key=lambda item: (-item.score, item.game.title.lower()))
    return scored[:limit]


def weighted_rating(rating_sum: float, count: int, global_mean: float, min_votes: int) -> float:
    return (min_votes * global_mean + rating_sum) / (min_votes + count)


def as_utc(moment: datetime) -> datetime:
    if moment.tzinfo is None:
        return moment.replace(tzinfo=UTC)
    return moment.astimezone(UTC)


def rank_games(
    games: Sequence[Game],
    reviews: Sequence[Review],
    now: datetime,
    days: int | None,
    min_votes: int,
    limit: int,
) -> list[RankedGame]:
    window = [
        review
        for review in reviews
        if days is None or as_utc(review.created_at) >= as_utc(now) - timedelta(days=days)
    ]
    if not window:
        return []

    global_mean = sum(review.rating for review in window) / len(window)
    ratings_by_game: dict[str, list[int]] = defaultdict(list)
    for review in window:
        ratings_by_game[review.game_id].append(review.rating)

    ranked: list[RankedGame] = []
    for game in games:
        ratings = ratings_by_game.get(game.id)
        if not ratings:
            continue
        ranked.append(
            RankedGame(
                game=game,
                average_rating=round(sum(ratings) / len(ratings), 2),
                weighted_rating=round(
                    weighted_rating(sum(ratings), len(ratings), global_mean, min_votes), 2
                ),
                review_count=len(ratings),
            )
        )

    ranked.sort(key=lambda item: (-item.weighted_rating, item.game.title.lower()))
    return ranked[:limit]
