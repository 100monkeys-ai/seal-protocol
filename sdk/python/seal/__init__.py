__version__ = "0.1.0"

from .client import SEALClient, SEALError, AttestationResult
from .crypto import Ed25519Key
from .envelope import create_seal_envelope, create_canonical_message
from .server import verify_seal_envelope

__all__ = [
    "SEALClient",
    "SEALError",
    "AttestationResult",
    "Ed25519Key",
    "create_seal_envelope",
    "create_canonical_message",
    "verify_seal_envelope",
]
