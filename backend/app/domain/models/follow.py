import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Uuid, func, select
from sqlalchemy.orm import Mapped, column_property, mapped_column

from app.domain.models.user import User
from app.infrastructure.database import Base


class Follow(Base):
    """follower_id segue followed_id. Só contas especialistas podem ser seguidas
    (regra garantida no FollowService)."""

    __tablename__ = "follows"
    __table_args__ = (CheckConstraint("follower_id <> followed_id", name="ck_follow_not_self"),)

    follower_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    followed_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# Número de seguidores, calculado pelo banco sempre que o usuário é carregado.
# Fica aqui (e não em user.py) porque precisa da tabela follows já definida.
User.followers_count = column_property(
    select(func.count())
    .where(Follow.followed_id == User.id)
    .correlate_except(Follow)
    .scalar_subquery()
)
