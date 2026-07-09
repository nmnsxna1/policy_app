from app.models.application import ApplicationStatus, VALID_TRANSITIONS


def can_transition(current: ApplicationStatus, target: ApplicationStatus) -> bool:
    allowed = VALID_TRANSITIONS.get(current, [])
    return target in allowed


def get_allowed_transitions(current: ApplicationStatus) -> list[str]:
    return [s.value for s in VALID_TRANSITIONS.get(current, [])]
