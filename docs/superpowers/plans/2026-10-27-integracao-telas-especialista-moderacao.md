# Integração das telas (especialista, admin, moderação, perfil, avisos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire every placeholder screen of branch `feat/telas-especialista-admin` to a real backend, and add the moderator role, comment reports, a public user profile, full expert analyses, expert requests, notifications (with `expo-notifications`) and real admin stats.

**Architecture:** Backend grows by new resources, each following the existing layering (model → schema → abstract interface → repository → service → endpoint → `api/dependencies.py`), with domain errors raised from services and turned into HTTP by the global handlers in `main.py`. A `NotificationService` is the single way any service creates an in-app notice + Expo push. The mobile app keeps the branch's design (Ultravioleta theme, `BottomTabs`, `TopBar`/`BackBar`, `StatTile`, `Tag`, `FilterPills`) and the `main` folder layout (screens in `src/app`, shared pieces in `src/components`, API types in `src/types/index.ts`, global state in `src/context`, colors only from `src/theme/colors.ts`).

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy 2 async, Alembic, pytest + httpx (SQLite in memory); Expo SDK 57, Expo Router, TypeScript, `expo-notifications`, `expo-device`.

**Spec:** `docs/superpowers/specs/2026-10-27-integracao-telas-especialista-moderacao-design.md` (read it: it fixes the behavior; this plan fixes names and order).

## Global Constraints

- Work on branch `feat/integracao-telas` (already created from `feat/telas-especialista-admin`). Do not push.
- Backend commands run from `backend/` with `.venv/Scripts/python -m pytest -q` and `.venv/Scripts/python -m alembic ...`. Mobile typecheck runs from `mobile/` with `npx tsc --noEmit -p .`.
- Must work on SQLite and Azure SQL (`mssql+aioodbc`). New enums use `Enum(..., native_enum=False, length=N)` like `users.role`.
- Every user-linked FK in the report log uses `ON DELETE SET NULL`; `review_reports.review_id` has **no** FK.
- List endpoints use `skip` (≥0) and `limit` (1–100, default 20), like the current ones.
- Moderators never act on admins or other moderators (403). Moderator undoes only bans whose `deactivated_by_role == "moderator"`.
- Expert accounts: no friendships (new requests to/from them → 400); cannot be moderators.
- Visible text in Portuguese; code identifiers follow the surrounding code. Keep the "TEXTO EDITÁVEL / CAMINHO" comment style in screens.
- No hard-coded colors besides `#FFFFFF` text on accent: new key `success` in `colors.ts` replaces `#2F9E6E`/`#4CC38A`.
- Push failure never fails the request that caused it; `PUSH_ENABLED=false` in tests.
- Each backend task ships its Alembic migration, generated with `alembic revision --autogenerate` against a DB at head, reviewed by hand (SQLite needs `op.batch_alter_table` for constraint changes), and proven with `alembic upgrade head` on a copy of `gamestar.db`.

## Review Focus

1. A muted user must not touch any comment — create, edit, delete own, or report — all 403 (Task 4 tests `test_muted_user_cannot_edit_review`, `test_muted_user_cannot_delete_own_review`; Task 5 test `test_muted_user_cannot_report`).
2. Reporting your own comment must be refused (400), and reporting twice must not double the count — Task 5 tests `test_cannot_report_own_review`, `test_duplicate_report_counts_once`.
3. Expo push endpoint down/timeouts must not break following or deleting — Task 3 test `test_push_failure_does_not_break_action`.
4. Approving a request whose user meanwhile became moderator, expert or was banned must be refused (400) — Task 6 test `test_approve_refused_when_user_no_longer_eligible`.
5. Pinning a second analysis must unpin the first — Task 4 test `test_pinning_unpins_previous`.

---

### Task 1: Moderator role, mute and ban-origin fields

**Files:**
- Modify: `backend/app/domain/models/user.py`, `backend/app/domain/schemas/user.py`, `backend/app/services/user_service.py`, `backend/app/api/dependencies.py`, `backend/app/api/v1/endpoints/users.py`
- Create: `backend/migrations/versions/<rev>_moderator_role_and_mute.py`
- Test: `backend/tests/integration/test_moderator_role.py`, helper `make_moderator` in `backend/tests/integration/helpers.py`

**Interfaces:**
- Produces:
  - `UserRole.moderator = "moderator"`; `User.is_muted: bool` (server_default false); `User.deactivated_by_role: str | None` (String(10)); properties `User.is_moderator`, `User.can_moderate` (moderator or admin).
  - `UserResponse` gains `is_muted: bool = False`, `deactivated_by_role: str | None = None`.
  - Schema `RoleUpdate(role: Literal["user", "moderator"])`.
  - `UserService.set_role(user_id: uuid.UUID, role: UserRole) -> User` (400 if target is admin or expert).
  - `UserService.set_active(admin, user_id, active)` now also writes `deactivated_by_role = "admin"` / `None`.
  - Dependency `ModeratorUser = Annotated[User, Depends(get_current_moderator_user)]` (moderator or admin, else 403).
  - Endpoint `PUT /api/v1/users/{id}/role` (AdminUser) → `UserResponse`.
  - Test helper `make_moderator(db_session, user_id)`.

- [ ] **Step 1: Write failing tests** in `test_moderator_role.py`:
  - `test_admin_can_make_and_unmake_moderator`: PUT role `moderator` → 200, `role == "moderator"`; PUT `user` → `role == "user"`.
  - `test_non_admin_cannot_set_role`: moderator calling PUT role → 403.
  - `test_cannot_make_expert_moderator`: target expert → 400.
  - `test_cannot_set_admin_role_via_api`: body `{"role": "admin"}` → 422.
  - `test_admin_deactivate_records_origin`: PATCH status `is_active=false` → `deactivated_by_role == "admin"`; reactivate → `None`.
- [ ] **Step 2: Run** `.venv/Scripts/python -m pytest tests/integration/test_moderator_role.py -q` → FAIL (404/422 on role route).
- [ ] **Step 3: Implement** the model fields/properties, schemas, service method, `get_current_moderator_user` and the endpoint listed in Interfaces.
- [ ] **Step 4: Generate the migration** (`alembic revision --autogenerate -m "moderator role and mute"`), keep only the two `add_column`s (`is_muted` with `server_default=sa.false()`), then `cp gamestar.db $TMP/gs.db` and run `DATABASE_URL=sqlite+aiosqlite:///$TMP/gs.db .venv/Scripts/python -m alembic upgrade head` → no error.
- [ ] **Step 5: Run** the new tests and the full suite → all PASS.
- [ ] **Step 6: Commit** `feat(api): moderator role, mute flag and ban origin`.

### Task 2: Public profile, locked `GET /users/{id}`, account-type filter, followers list, experts without friends

**Files:**
- Modify: `backend/app/domain/schemas/user.py`, `backend/app/domain/interfaces/user_repository.py`, `backend/app/infrastructure/repositories/user_repository.py`, `backend/app/services/user_service.py`, `backend/app/domain/interfaces/follow_repository.py`, `backend/app/infrastructure/repositories/follow_repository.py`, `backend/app/services/follow_service.py`, `backend/app/services/friendship_service.py`, `backend/app/api/v1/endpoints/users.py`
- Test: `backend/tests/integration/test_profile_public.py`; extend `test_experts.py`, `test_friends.py`, `test_admin.py` (fix any test that read `GET /users/{id}` anonymously)

**Interfaces:**
- Consumes: Task 1 fields, `ModeratorUser`.
- Produces:
  - `PublicProfile` schema: `id, username, display_name, avatar_url, bio, account_type, expertise_area, company, followers_count, role, is_active: bool | None = None, is_muted: bool | None = None, deactivated_by_role: str | None = None` (the last three filled only when the viewer `can_moderate`).
  - `GET /api/v1/users/{id}/profile` (CurrentUserFull) → `PublicProfile`; 404 for missing; inactive users still visible to moderators/admin, 404 for others.
  - `GET /api/v1/users/{id}` now requires login and returns only to admin or self (else 403).
  - `GET /api/v1/users?type=normais|especialistas|moderadores|banidas|admins` (admin); `UserRepository.list_filtered(query: str | None, account_filter: str | None, *, skip, limit) -> list[User]` replaces the `list_all`/`search` branch in `UserService.list_users`.
  - `GET /api/v1/users/me/followers` (CurrentUserFull; 403 if not expert) → `list[UserResponse]`, newest first; `FollowRepository.list_followers(user_id) -> list[User]`.
  - `FriendshipService.send_request`/`accept_request` raise `BadRequestError("Expert accounts do not have friends.")` when either side `is_expert`.

- [ ] **Step 1: Write failing tests:**
  - `test_profile_hides_email`: `"email" not in resp.json()`; `bio`, `avatar_url` present.
  - `test_profile_moderation_fields_only_for_moderators`: normal viewer → `is_muted is None`; moderator viewer → `is_muted is False`.
  - `test_get_user_by_id_requires_admin_or_self`: anonymous → 401, other user → 403, self → 200, admin → 200.
  - `test_list_users_filter_banidas`: deactivate one → `?type=banidas` returns exactly it.
  - `test_expert_lists_followers` (in `test_experts.py`): two users follow → `GET /users/me/followers` returns both, newest first; normal account → 403.
  - `test_expert_cannot_send_or_receive_friend_request` and `test_cannot_accept_pending_request_after_becoming_expert` (in `test_friends.py`) → 400.
- [ ] **Step 2: Run** those tests → FAIL.
- [ ] **Step 3: Implement** the Interfaces above.
- [ ] **Step 4: Run** the full suite → all PASS (update old tests that relied on anonymous `GET /users/{id}`).
- [ ] **Step 5: Commit** `feat(api): public profile, followers list and expert friendship block`.

### Task 3: Notifications core (in-app + Expo push)

**Files:**
- Create: `backend/app/domain/models/notification.py` (`Notification`, `PushToken`), `backend/app/domain/schemas/notification.py`, `backend/app/domain/interfaces/notification_repository.py`, `backend/app/infrastructure/repositories/notification_repository.py`, `backend/app/infrastructure/push.py`, `backend/app/services/notification_service.py`, `backend/app/api/v1/endpoints/notifications.py`, migration `<rev>_notifications.py`
- Modify: `backend/app/core/config.py` (`push_enabled: bool = True`), `backend/.env.example` (`PUSH_ENABLED=true`), registries (`models/__init__.py`, `repositories/__init__.py`, `services/__init__.py`), `api/dependencies.py`, `api/v1/router.py`, `backend/tests/conftest.py` (autouse fixture setting `settings.push_enabled = False`)
- Test: `backend/tests/integration/test_notifications.py`

**Interfaces:**
- Produces:
  - `NotificationType` enum (`native_enum=False, length=20`): `new_follower`, `friend_request`, `expert_request_approved`, `expert_request_rejected`, `review_removed`, `muted`, `unmuted`.
  - Table `notifications`: `id`, `user_id` (FK CASCADE, index), `type`, `title` String(120), `body` String(300), `data` JSON nullable (`{"route": "/..."}`), `read_at` nullable, `created_at`.
  - Table `push_tokens`: `token` String(200) PK, `user_id` (FK CASCADE, index), `platform` String(10), `created_at`.
  - `PushSender` in `infrastructure/push.py`: `async def send(self, tokens: list[str], title: str, body: str, data: dict) -> list[str]` — POSTs to `https://exp.host/--/api/v2/push/send` with `httpx.AsyncClient(timeout=5)`, returns tokens answered with `DeviceNotRegistered`; any exception is logged and returns `[]`.
  - `NotificationService(repo, push_sender)`:
    - `async def notify(self, user_id: uuid.UUID, type: NotificationType, title: str, body: str, route: str | None = None) -> None` — always stores; pushes only if `settings.push_enabled` and the user has tokens; deletes dead tokens.
    - `list_for_user`, `unread_count`, `mark_read(user_id, notification_id)`, `mark_all_read(user_id)`, `register_token(user_id, token, platform)` (moves a token already owned by another user), `remove_token(user_id, token)`.
  - Dependency `NotificationServiceDep`; `get_notification_service` builds `NotificationService(NotificationRepository(session), PushSender())`.
  - Endpoints under `/api/v1/notifications` (CurrentUserFull): `GET ""` → `list[NotificationResponse]`; `GET /unread-count` → `{"count": int}`; `POST /{id}/read` → 204; `POST /read-all` → 204; `PUT /push-token` body `{token, platform}` → 204; `DELETE /push-token` body `{token}` → 204.
  - Event hooks in this task: `FollowService.follow` notifies the expert (`new_follower`, route `/especialista/seguidores`) only when a new follow row is created; `FriendshipService.send_request` notifies the target (`friend_request`, route `/amigos`) only if `target.notify_friend_requests`. Both services receive `NotificationService` through their constructors (update `get_follow_service` / `get_friendship_service`).

- [ ] **Step 1: Write failing tests:**
  - `test_follow_creates_notification_for_expert`: follow → expert's `GET /notifications` has one `new_follower`; following again does not add another.
  - `test_friend_request_respects_preference`: target with `notify_friend_requests=false` gets none.
  - `test_unread_count_and_mark_all_read`.
  - `test_cannot_mark_other_users_notification`: → 404.
  - `test_push_token_moves_between_users`: same token registered by user B → row owned by B.
  - `test_push_failure_does_not_break_action`: monkeypatch `settings.push_enabled=True` and `PushSender.send` to raise inside its httpx call (use `httpx.MockTransport` raising `httpx.ConnectError`) → follow still 200 and notification stored.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the Interfaces above.
- [ ] **Step 4: Migration** (autogenerate, check JSON column renders as `sa.JSON()`), upgrade a copy of `gamestar.db` → OK.
- [ ] **Step 5: Run** full suite → PASS.
- [ ] **Step 6: Commit** `feat(api): notifications with expo push`.

### Task 4: Expert analysis fields, game info in reviews, mute enforcement, moderator delete

**Files:**
- Modify: `backend/app/domain/models/review.py`, `backend/app/domain/schemas/review.py`, `backend/app/domain/interfaces/review_repository.py`, `backend/app/infrastructure/repositories/review_repository.py`, `backend/app/services/review_service.py`, `backend/app/api/v1/endpoints/reviews.py`, migration `<rev>_review_analysis_fields.py`
- Test: `backend/tests/integration/test_reviews_expert.py`; extend `tests/unit/test_review_service.py` if its fakes break

**Interfaces:**
- Consumes: Task 1 (`is_muted`, `can_moderate`); Task 3 `NotificationService.notify`.
- Produces:
  - `Review.title` String(120), `Review.pros` String(500), `Review.cons` String(500) (all nullable), `Review.pinned` Boolean server_default false.
  - `ReviewCreate`/`ReviewUpdate` accept `title`, `pros`, `cons`, `pinned`; `ReviewResponse` adds those plus `game_title: str | None`, `game_cover_url: str | None` (repository eager-loads `Review.game`).
  - `ReviewService.create_review(author: User, data)` / `update_review(review_id, author: User, data)` — signatures now take the `User` (endpoints pass `CurrentUserFull`): 403 `"Your account is muted."` if `author.is_muted` (also in `delete_review` when the muted user is the author); 400 if a non-expert sends any of `title/pros/cons/pinned=True`; pinning calls `repo.unpin_all(user_id)` first.
  - `ReviewService.delete_review(review_id, requester: User)`: author, or `requester.can_moderate` (moderator can't delete reviews of admins/moderators → 403). When the deleter is not the author it calls the moderation hook `on_review_removed_by_moderation` (Produces for Task 5: `ReviewService` gets an optional `moderation_hook: Callable[[Review, User], Awaitable[None]] | None`; until Task 5 it only sends `review_removed` notification to the author with route `/jogo/{game_id}`).

- [ ] **Step 1: Write failing tests:**
  - `test_expert_creates_full_analysis`: POST with title/pros/cons/pinned → response echoes them, `game_title == "Jogo de Teste"`.
  - `test_normal_user_cannot_send_expert_fields` → 400.
  - `test_pinning_unpins_previous`: pin review on game A then on game B → A `pinned is False`.
  - `test_muted_user_cannot_create_review` and `test_muted_user_cannot_edit_review` → 403.
  - `test_muted_user_cannot_delete_own_review` → 403.
  - `test_moderator_deletes_any_review_and_author_is_notified` → 204, author has a `review_removed` notification.
  - `test_moderator_cannot_delete_admin_review` → 403.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**; migration (`pinned` with `server_default=sa.false()`); upgrade a copy of `gamestar.db`.
- [ ] **Step 4: Run** full suite → PASS.
- [ ] **Step 5: Commit** `feat(api): expert analysis fields and moderator review delete`.

### Task 5: Reports log and moderation endpoints

**Files:**
- Create: `backend/app/domain/models/review_report.py`, `backend/app/domain/schemas/moderation.py`, `backend/app/domain/interfaces/review_report_repository.py`, `backend/app/infrastructure/repositories/review_report_repository.py`, `backend/app/services/moderation_service.py`, `backend/app/api/v1/endpoints/moderation.py`, migration `<rev>_review_reports.py`
- Modify: registries, `api/dependencies.py`, `api/v1/router.py`, `api/v1/endpoints/reviews.py` (report route), `services/review_service.py` (hook wiring)
- Test: `backend/tests/integration/test_moderation.py`

**Interfaces:**
- Consumes: Tasks 1, 3, 4.
- Produces:
  - `ReportReason` enum: `ofensivo`, `spam`, `spoiler`, `outro`; `ReportStatus`: `pending`, `kept`, `removed`.
  - Table `review_reports`: `id`, `review_id` Uuid (no FK, index), `reporter_id` (FK SET NULL), `reason`, `review_body` Text, `review_rating` Integer, `review_author_id` (FK SET NULL), `review_author_name` String(60), `game_id` (FK SET NULL), `game_title` String(200), `status` (default pending, index), `resolved_by_id` (FK SET NULL), `resolved_at`, `created_at`; unique (`review_id`, `reporter_id`).
  - `POST /api/v1/reviews/{review_id}/report` body `{reason}` (CurrentUserFull) → 204; own review → 400; repeat → 204 without a new row. Muted reporter → 403.
  - `GET /api/v1/reviews/game/{game_id}/my-reports` (CurrentUserFull) → `list[uuid.UUID]` of review ids of that game the caller reported (pending or resolved). Declare it before `/reviews/{review_id}` routes.
  - `ModerationService` methods: `report(reporter, review_id, reason)`, `list_reports(status, query, skip, limit) -> list[ReportGroup]`, `keep(moderator, review_id)`, `remove_review(moderator, review_id)` (deletes the review if it still exists, marks pending reports `removed`, notifies author), `recent_reviews(query, skip, limit)`, `ban(moderator, user_id)`, `unban(moderator, user_id)`, `mute(moderator, user_id)`, `unmute(moderator, user_id)`, and `on_review_removed(review, moderator)` used as `ReviewService.moderation_hook`.
  - `ReportGroup` schema: `review_id, review_exists: bool, current_body: str | None, review_body, review_rating, author_id, author_name, author_is_muted: bool | None, author_is_active: bool | None, game_id, game_title, reasons: list[ReportReason], reporters_count: int, last_reported_at, status`.
  - Endpoints under `/api/v1/moderation` (ModeratorUser): `GET /reports?status=pending&q=` → `list[ReportGroup]`; `GET /reports/pending-count` → `{"count": int}`; `POST /reviews/{review_id}/keep` → 204; `DELETE /reviews/{review_id}` → 204; `GET /reviews/recent?q=` → `list[ReviewResponse]`; `POST /users/{id}/ban|unban|mute|unmute` → `UserResponse`.
  - Rules: ban sets `is_active=False, deactivated_by_role=<actor role>`; unban by moderator only if `deactivated_by_role == "moderator"` (else 403); actor can't target self, admins, or (if moderator) other moderators (403); mute/unmute notify the user (`muted`/`unmuted`, route `/avisos`).

- [ ] **Step 1: Write failing tests:**
  - `test_cannot_report_own_review` → 400; `test_duplicate_report_counts_once` → `reporters_count == 1`.
  - `test_muted_user_cannot_report` → 403; `test_my_reports_lists_reported_ids`: report one of two reviews → endpoint returns exactly that id.
  - `test_reports_visible_only_to_moderators_and_admin`: normal user → 403.
  - `test_keep_resolves_pending_reports`: status `kept` listed under `?status=kept`.
  - `test_remove_review_marks_removed_and_notifies_author`.
  - `test_log_survives_author_deleting_review`: author deletes own review → group still pending, `review_exists is False`, `review_body` kept.
  - `test_log_survives_author_account_deletion`: `author_id is None`, `author_name` kept.
  - `test_moderator_cannot_unban_admin_deactivation` → 403; `test_admin_can_unban_moderator_ban` → 200.
  - `test_moderator_cannot_act_on_moderator_or_admin` → 403.
  - `test_mute_notifies_user`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**; migration; upgrade a copy of `gamestar.db`.
- [ ] **Step 4: Run** full suite → PASS.
- [ ] **Step 5: Commit** `feat(api): review reports and moderation actions`.

### Task 6: Expert requests

**Files:**
- Create: `backend/app/domain/models/expert_request.py`, `backend/app/domain/schemas/expert_request.py`, `backend/app/domain/interfaces/expert_request_repository.py`, `backend/app/infrastructure/repositories/expert_request_repository.py`, `backend/app/services/expert_request_service.py`, `backend/app/api/v1/endpoints/expert_requests.py`, migration `<rev>_expert_requests.py`
- Modify: registries, `api/dependencies.py`, `api/v1/router.py`
- Test: `backend/tests/integration/test_expert_requests.py`

**Interfaces:**
- Consumes: Task 3 `notify`.
- Produces:
  - `ExpertRequestStatus`: `pending`, `approved`, `rejected`. Table `expert_requests`: `id`, `user_id` (FK CASCADE, index), `expertise_area` (ExpertArea enum), `company` String(80) nullable, `link` String(300) nullable, `message` String(1000), `status`, `rejection_reason` String(300) nullable, `decided_by_id` (FK SET NULL), `created_at`, `decided_at`.
  - `ExpertRequestCreate(expertise_area, company?, link?, message min 10)`; `ExpertRequestReject(reason min 3)`; `ExpertRequestResponse` adds `username`, `display_name`, `avatar_url` of the requester.
  - Endpoints under `/api/v1/expert-requests`: `POST ""` (CurrentUserFull) → 201; `GET /me` → last request or `null`; admin: `GET ""?status=`, `GET /{id}`, `POST /{id}/approve`, `POST /{id}/reject`.
  - Rules: only `role == user` and non-expert may create (400); one pending at a time (409); approve sets `account_type=especialista`, `expertise_area`, `company` from the request and notifies (`expert_request_approved`, route `/perfil`); reject notifies with the reason (`expert_request_rejected`); deciding a non-pending request → 409; approve when the user is no longer eligible (expert, moderator/admin, inactive) → 400.

- [ ] **Step 1: Write failing tests:** `test_user_creates_request_and_sees_it`, `test_only_one_pending_request` (409), `test_moderator_cannot_request` (400), `test_admin_approves_and_user_becomes_expert` (+ notification), `test_reject_requires_reason` (422) and stores it, `test_non_admin_cannot_list_requests` (403), `test_approve_refused_when_user_no_longer_eligible` (400).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**; migration; upgrade a copy of `gamestar.db`.
- [ ] **Step 4: Run** full suite → PASS.
- [ ] **Step 5: Commit** `feat(api): expert requests`.

### Task 7: Admin stats

**Files:**
- Create: `backend/app/services/admin_service.py`, `backend/app/api/v1/endpoints/admin.py`, `backend/app/domain/schemas/admin.py`
- Modify: `api/dependencies.py`, `api/v1/router.py`, `services/__init__.py`
- Test: `backend/tests/integration/test_admin_stats.py`

**Interfaces:**
- Produces: `GET /api/v1/admin/stats` (AdminUser) → `AdminStats { users, experts, moderators, banned, muted, games, reviews, pending_expert_requests, pending_reports, recent_activity: list[ActivityItem] }`, `ActivityItem { kind: Literal["expert_request","report"], title: str, created_at: datetime, route: str }` (5 newest across both sources; routes `/admin/pedido/{id}` and `/admin/moderacao`). `AdminService` runs `select(func.count())` queries through a session-backed repository method set it owns (`AdminStatsRepository` in `infrastructure/repositories/admin_stats_repository.py`, interface in `domain/interfaces/`).

- [ ] **Step 1: Write failing test** `test_stats_counts_and_activity`: seed 1 expert, 1 moderator, 1 banned, 1 game, 1 review, 1 pending request, 1 report → each counter matches and `recent_activity` has 2 items newest first; `test_stats_admin_only` → 403 for moderator.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** full suite → PASS.
- [ ] **Step 5: Commit** `feat(api): admin stats`.

### Task 8: Mobile foundations (types, auth flags, colors, tabs, routes)

**Files:**
- Modify: `mobile/src/types/index.ts`, `mobile/src/context/AuthContext.tsx`, `mobile/src/theme/colors.ts`, `mobile/src/components/Tag.tsx`, `mobile/src/components/BottomTabs.tsx`, `mobile/src/app/_layout.tsx`, `mobile/src/app/admin/pedido/[id].tsx` (color only)

**Interfaces:**
- Produces:
  - `UserRole = "admin" | "moderator" | "user"`; `ApiUser` adds `avatar_url, bio, company, is_muted, deactivated_by_role`; new types (snake_case API + mappers where the screen needs camelCase): `ApiPublicProfile`, `ApiReview` adds `title, pros, cons, pinned, game_title, game_cover_url` and `Review` adds `title, pros, cons, pinned, gameTitle, gameCover` (via `mapApiReview`); `ApiReportGroup`, `ReportReason` + `REPORT_REASONS: {value,label}[]` (Ofensivo/Spam/Spoiler/Outro); `ApiExpertRequest`, `ExpertRequestStatus`; `ApiNotification`; `ApiAdminStats`.
  - `AuthUser.isMuted: boolean`; `useAuth()` adds `isModerator`, `canModerate`, and `refreshMe(): Promise<void>`.
  - `palette.success = "#4CC38A"`; `Tag` tone `ok` uses it.
  - `MODERATOR_TABS` = `USER_TABS` + `{ label: "Moderação", icon: "flag-outline", path: "/moderacao" }` (badge filled in Task 10). `BottomTabs` picks admin → moderator → expert → user.
  - `_layout.tsx`: `<Stack.Screen name="avisos" />` in the logged-in group; new `<Stack.Protected guard={!!user && canModerate}>` with `moderacao`; `especialista/avisos` removed (file deleted in Task 13).
- [ ] **Step 1:** Implement; **Step 2:** `npx tsc --noEmit -p .` → exit 0 (screens referencing removed things fixed in their tasks; if `especialista/avisos` breaks typecheck, leave it until Task 13).
- [ ] **Step 3: Commit** `feat(mobile): types, roles and tabs for integration`.

### Task 9: Profile screen and tappable names

**Files:**
- Modify: `mobile/src/app/perfil-publico/[id].tsx`, `mobile/src/app/jogo/[id].tsx` (author tap for all), `mobile/src/components/FriendCard.tsx` (optional `onPressName`), `mobile/src/app/amigos.tsx`, `mobile/src/app/especialista/seguidores.tsx` ("SEGUINDO" taps stay; "SEGUIDORES" list real and non-tappable)
- Create: `mobile/src/components/ProfileGameSection.tsx` (one game section: cover, title → `/jogo/{id}`, the review with rating/body/date and, for experts, title/pros/cons), `mobile/src/components/moderation/ModerationActions.tsx` (status `Tag`s + Silenciar/Tirar silêncio + Banir/Desbanir buttons, calls Task 5 endpoints, hides unban for moderator when `deactivated_by_role === "admin"`)

**Interfaces:**
- Consumes: `GET /users/{id}/profile`, `GET /reviews/user/{id}?limit=100`, `GET /users/me/followers`, moderation endpoints.
- Produces: `ModerationActions({ profile: ApiPublicProfile, onChange(p) })` reused by Task 10.

- [ ] **Step 1:** Rewrite `perfil-publico/[id]` per spec §4: everyone sees name, avatar (`mediaUrl`), bio and one `ProfileGameSection` per review; expert profile adds badge, Seguir, `StatTile`s and pinned analysis first; `canModerate` viewer (and target not admin/moderator unless viewer is admin) sees `ModerationActions` and a trash icon per section (`DELETE /moderation/reviews/{id}`).
- [ ] **Step 2:** Make names tappable in the four places of spec §4; followers list rows have no `onPress`.
- [ ] **Step 3:** `npx tsc --noEmit -p .` → exit 0.
- [ ] **Step 4: Commit** `feat(mobile): user profile screen and tappable names`.

### Task 10: Moderation UI

**Files:**
- Create: `mobile/src/components/moderation/ReportCard.tsx`, `mobile/src/components/moderation/ModerationPanel.tsx` (tabs DENÚNCIAS · n / RECENTES / HISTÓRICO + `SearchBar`), `mobile/src/components/ReportModal.tsx`, `mobile/src/app/moderacao.tsx`
- Modify: `mobile/src/app/admin/moderacao.tsx` (renders `ModerationPanel`), `mobile/src/app/jogo/[id].tsx` (flag on others' comments → `ReportModal` → `POST /reviews/{id}/report`, "Denúncia enviada"; the flag is disabled (dimmed, `disabled`) for ids returned by `GET /reviews/game/{id}/my-reports`, loaded with the reviews and updated right after a report; trash for `canModerate`; a muted user sees "Sua conta está silenciada" and no comment, edit, delete or report controls), `mobile/src/app/admin/conta/[id].tsx` (Tornar/Remover moderador via `PUT /users/{id}/role`; status row shows banned origin), `mobile/src/components/admin/UsersAdmin.tsx` (server-side `type` filter, avatar), `mobile/src/app/admin/contas.tsx` (filters TODAS/NORMAIS/ESPECIALISTAS/MODERADORES/BANIDAS/ADMINS), `mobile/src/components/BottomTabs.tsx` (Moderação badge from `GET /moderation/reports/pending-count`, refreshed on focus)

**Interfaces:**
- Consumes: Task 5 endpoints, Task 9 `ModerationActions`.
- [ ] **Step 1:** `ReportCard` follows the branch card (author · game, reason `Tag`s, quoted snapshot, "comentário apagado pelo autor" when `!review_exists`, current text when edited, "Denunciado por N usuário(s) · quando"; buttons Manter / Apagar / Silenciar autor or Banir autor); author name → `/perfil-publico/{author_id}` when not null.
- [ ] **Step 2:** Wire the remaining files listed above.
- [ ] **Step 3:** `npx tsc --noEmit -p .` → exit 0.
- [ ] **Step 4: Commit** `feat(mobile): moderation panel, reports and moderator account`.

### Task 11: Nova análise and expert content on the game page

**Files:**
- Modify: `mobile/src/app/especialista/nova-analise.tsx`, `mobile/src/app/jogo/[id].tsx`, `mobile/src/context/LibraryContext.tsx` (refresh `myReviews` after save; expose `refreshMyReviews` if missing)

- [ ] **Step 1:** Nova análise: with `jogoId` of an already-reviewed game load it (edit mode, title "Editar análise", button "Salvar", extra "Excluir análise" with `confirmAction`); publish → `POST /reviews` (rating via `starsToApiRating`) or `PATCH`; validation: game chosen and rating > 0; errors shown in `colors.danger`; remove `PreviewBanner`; on success `router.replace("/especialista/analises")`.
- [ ] **Step 2:** Game page: expert's comment button → `router.push(\`/especialista/nova-analise?jogoId=${id}\`)`; expert comments render title (bold), body, "Prós"/"Contras" lines when present.
- [ ] **Step 3:** `npx tsc --noEmit -p .` → exit 0. **Step 4: Commit** `feat(mobile): full expert analysis`.

### Task 12: Expert requests, admin overview, expert panel

**Files:**
- Modify: `mobile/src/app/pedir-especialista.tsx`, `mobile/src/app/admin/pedidos.tsx`, `mobile/src/app/admin/pedido/[id].tsx`, `mobile/src/app/admin/index.tsx`, `mobile/src/app/especialista/index.tsx`, `mobile/src/app/perfil.tsx` (after approval `refreshMe` on focus so the account switches to expert)

- [ ] **Step 1:** Pedir especialista: load `GET /expert-requests/me`; pending → card "Pedido em análise" and form hidden; rejected → card with reason and form shown again; submit → `POST`; area required, message ≥ 10 chars.
- [ ] **Step 2:** Admin pedidos/pedido: real list with `?status=` per pill and counts; detail shows avatar, `@username`, area label, company, link as a button (`Linking.openURL`, prefix `https://` when missing), message; Aprovar / Recusar (reason required) → endpoints, then back to list.
- [ ] **Step 3:** Admin index: `GET /admin/stats` → alerts (pending requests/reports), `StatTile`s (Usuários, Especialistas, Moderadores, Banidas, Jogos, Comentários), recent activity rows using `item.route`; drop the `limit=200` call.
- [ ] **Step 4:** Expert panel: replace the "Comentários recebidos" tile with "Notas no catálogo" showing `myReviews.length` (spec §8); refresh `followersCount` via `refreshMe` on focus.
- [ ] **Step 5:** `npx tsc --noEmit -p .` → exit 0. **Step 6: Commit** `feat(mobile): expert requests and admin overview`.

### Task 13: Notifications in the app

**Files:**
- Create: `mobile/src/context/NotificationsContext.tsx`, `mobile/src/app/avisos.tsx`
- Delete: `mobile/src/app/especialista/avisos.tsx`
- Modify: `mobile/package.json` (via `npx expo install expo-notifications expo-device`), `mobile/app.json` (plugin `"expo-notifications"`), `mobile/src/app/_layout.tsx` (provider inside `AuthProvider`), `mobile/src/components/TopBar.tsx` (bell for every account, red count), `mobile/src/context/AuthContext.tsx` (logout calls the context's unregister through a callback prop or by the provider observing `user` → null), `mobile/README.md` (FCM steps from spec §7)

**Interfaces:**
- Produces: `useNotifications(): { items: ApiNotification[]; unread: number; refresh(): Promise<void>; markRead(id: string): Promise<void>; markAllRead(): Promise<void> }`.
- [ ] **Step 1:** Provider: when `user` becomes non-null → `refresh()`, and if `Device.isDevice && Constants.appOwnership !== "expo" && Platform.OS !== "web"` request permission, `getExpoPushTokenAsync({ projectId: Constants.expoConfig?.extra?.eas?.projectId })`, `PUT /notifications/push-token`; on `user` → null `DELETE` the stored token (best-effort, before `setAuthToken(null)`); `addNotificationResponseReceivedListener` → `router.push(data.route)`; `setNotificationHandler` shows alerts in foreground; poll `unread-count` on app focus.
- [ ] **Step 2:** `/avisos` screen: `TopBar` + list (unread highlighted with `colors.accent` border), tap → mark read + `router.push(route)`, "Marcar todas como lidas", empty state copy from the branch's avisos screen.
- [ ] **Step 3:** `npx tsc --noEmit -p .` → exit 0; `npx expo export --platform web` (or `npx expo start --web` smoke) shows no bundling error.
- [ ] **Step 4: Commit** `feat(mobile): notifications with expo-notifications`.

### Task 14: Cleanup, docs and end-to-end verification

**Files:**
- Delete: `mobile/src/data/adminPreview.ts`, `mobile/src/components/PreviewBanner.tsx` (after `grep -r "PreviewBanner\|adminPreview" mobile/src` returns nothing)
- Modify: `mobile/README.md` (folder structure with new screens/components/context), root `README.md` (new endpoints if it lists endpoints)

- [ ] **Step 1:** Delete and grep → no matches; `npx tsc --noEmit -p .` → exit 0.
- [ ] **Step 2:** Backend full suite → all PASS; `alembic upgrade head` on a copy of `gamestar.db` and on a fresh SQLite file → OK.
- [ ] **Step 3:** Run API (`uvicorn main:app --port 8000`) + app (`npx expo start --web`) and walk the five flows of spec "Verificação" (report → moderator deletes → author notice; request → admin approves → expert; follow → expert sees follower + notice; tapping names opens profile; expert publishes pinned full analysis). Record which passed; push is reported as not verified unless tested on an APK with FCM.
- [ ] **Step 4: Commit** `chore: remove preview data and update docs`.
