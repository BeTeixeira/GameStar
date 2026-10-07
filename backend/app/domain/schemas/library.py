import uuid
from datetime import datetime

from pydantic import BaseModel

from app.domain.models.library_entry import LibraryStatus


class LibraryEntrySet(BaseModel):
    status: LibraryStatus


class LibraryEntryResponse(BaseModel):
    model_config = {"from_attributes": True}

    game_id: uuid.UUID
    status: LibraryStatus
    created_at: datetime
    updated_at: datetime
