class NotFoundError(Exception):
    def __init__(self, resource: str, identifier: object) -> None:
        self.resource = resource
        self.identifier = identifier
        super().__init__(f"{resource} '{identifier}' not found.")


class ConflictError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)


class ForbiddenError(Exception):
    def __init__(self, message: str = "Operation not allowed.") -> None:
        super().__init__(message)


class BadRequestError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
