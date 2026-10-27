"""moderator role and mute

Revision ID: 81cb384984ec
Revises: 543f9739a286
Create Date: 2026-10-27 15:50:50.011321
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '81cb384984ec'
down_revision: Union[str, None] = '543f9739a286'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_muted', sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column('users', sa.Column('deactivated_by_role', sa.String(length=10), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'deactivated_by_role')
    op.drop_column('users', 'is_muted')
