from __future__ import annotations

from sqlalchemy.orm import Session

from app.algorithms import (
    AlgorithmError,
    LinearAlgebraEngine,
    NumPyLinearAlgebraEngine,
)
from app.core.exceptions import InvalidOperationError, ResourceNotFoundError
from app.models.operation import Operation
from app.models.matrix import Matrix
from app.models.vector import Vector
from app.repositories.matrix_repository import MatrixRepository
from app.repositories.operation_repository import OperationRepository
from app.repositories.vector_repository import VectorRepository
from app.schemas.common import OperationCategory, OperationStatus, OperationType
from app.schemas.operation import (
    OperationCreate,
    OperationResponse,
    OperationResult as OperationResultValue,
)
from app.services.base import BaseService


class OperationService(BaseService):
    """Executes mathematical use cases and persists their results."""

    def __init__(
        self,
        session: Session,
        *,
        engine: LinearAlgebraEngine | None = None,
    ) -> None:
        super().__init__(session)
        self.operations = OperationRepository(session)
        self.vectors = VectorRepository(session)
        self.matrices = MatrixRepository(session)
        self.engine = engine or NumPyLinearAlgebraEngine()

    def list(self, *, offset: int = 0, limit: int = 100) -> list[OperationResponse]:
        return [
            OperationResponse.model_validate(operation)
            for operation in self.operations.list_recent(offset=offset, limit=limit)
        ]

    def get(self, operation_id: int) -> OperationResponse:
        operation = self.operations.get_by_id(operation_id)
        if operation is None:
            raise ResourceNotFoundError("La operación solicitada no existe.")
        return OperationResponse.model_validate(operation)

    def execute(self, data: OperationCreate, *, user: str) -> OperationResponse:
        try:
            result = (
                self._execute_vector(data)
                if data.category == OperationCategory.VECTOR
                else self._execute_matrix(data)
            )
        except AlgorithmError as exc:
            raise InvalidOperationError(str(exc)) from exc

        return self.record(data, result=result, user=user)

    def record(
        self,
        data: OperationCreate,
        *,
        result: OperationResultValue,
        user: str,
        status: OperationStatus = OperationStatus.COMPLETED,
    ) -> OperationResponse:
        operation = Operation(
            category=data.category.value,
            operation_type=data.operation_type.value,
            inputs=self._describe_inputs(data),
            result=result,
            user=user,
            status=status.value,
        )
        with self.transaction():
            self.operations.add(operation)
        return OperationResponse.model_validate(operation)

    @staticmethod
    def _describe_inputs(data: OperationCreate) -> str:
        operands = [f"{data.category.value} #{data.first_id}"]
        if data.second_id is not None:
            operands.append(f"{data.category.value} #{data.second_id}")
        if data.scalar is not None:
            operands.append(f"escalar={data.scalar:g}")
        if data.coefficient_b is not None:
            operands.append(f"coeficienteB={data.coefficient_b:g}")
        return f"{data.operation_type.value}: " + ", ".join(operands)

    def _execute_vector(self, data: OperationCreate) -> OperationResultValue:
        first = self._get_vector(data.first_id)
        operation_type = data.operation_type

        if operation_type == OperationType.SCALE:
            return self.engine.scale_vector(first.values, self._required_scalar(data))

        second = self._get_vector(self._required_second_id(data))
        if operation_type == OperationType.ADD:
            return self.engine.add_vectors(first.values, second.values)
        if operation_type == OperationType.SUBTRACT:
            return self.engine.subtract_vectors(first.values, second.values)
        if operation_type == OperationType.DOT_PRODUCT:
            return self.engine.dot_product(first.values, second.values)
        if operation_type == OperationType.LINEAR_COMBINATION:
            if data.coefficient_b is None:
                raise InvalidOperationError(
                    "La combinación lineal requiere el coeficiente B."
                )
            return self.engine.linear_combination(
                first.values,
                second.values,
                self._required_scalar(data),
                data.coefficient_b,
            )
        raise InvalidOperationError("La operación vectorial no está soportada.")

    def _execute_matrix(self, data: OperationCreate) -> OperationResultValue:
        first = self._get_matrix(data.first_id)
        operation_type = data.operation_type

        if operation_type == OperationType.TRANSPOSE:
            return self.engine.transpose_matrix(first.values)
        if operation_type == OperationType.SCALE:
            return self.engine.scale_matrix(first.values, self._required_scalar(data))

        second = self._get_matrix(self._required_second_id(data))
        if operation_type == OperationType.ADD:
            return self.engine.add_matrices(first.values, second.values)
        if operation_type == OperationType.SUBTRACT:
            return self.engine.subtract_matrices(first.values, second.values)
        if operation_type == OperationType.MULTIPLY:
            return self.engine.multiply_matrices(first.values, second.values)
        raise InvalidOperationError("La operación matricial no está soportada.")

    def _get_vector(self, vector_id: int) -> Vector:
        vector = self.vectors.get_by_id(vector_id)
        if vector is None:
            raise ResourceNotFoundError("El vector solicitado no existe.")
        return vector

    def _get_matrix(self, matrix_id: int) -> Matrix:
        matrix = self.matrices.get_by_id(matrix_id)
        if matrix is None:
            raise ResourceNotFoundError("La matriz solicitada no existe.")
        return matrix

    @staticmethod
    def _required_second_id(data: OperationCreate) -> int:
        if data.second_id is None:
            raise InvalidOperationError(
                "La operación seleccionada requiere un segundo operando."
            )
        return data.second_id

    @staticmethod
    def _required_scalar(data: OperationCreate) -> float:
        if data.scalar is None:
            raise InvalidOperationError(
                "La operación seleccionada requiere un escalar."
            )
        return data.scalar
