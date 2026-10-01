from pydantic import Field

from app.schemas.common import APIModel, FiniteNumber, PositiveId, UpdateModel


class TargetCreate(APIModel):
    branch_id: PositiveId
    name: str = Field(min_length=3, max_length=150)
    target_value: FiniteNumber = Field(gt=0)


class TargetUpdate(UpdateModel):
    branch_id: PositiveId | None = None
    name: str | None = Field(default=None, min_length=3, max_length=150)
    target_value: FiniteNumber | None = Field(default=None, gt=0)


class TargetResponse(TargetCreate):
    id: PositiveId
