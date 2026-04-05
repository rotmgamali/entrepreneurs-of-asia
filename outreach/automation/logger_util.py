"""
Logging utility for EOA outreach engine.
Adapted from Ivybound mailreef_automation/logger_util.py
"""
import logging
import os
from logging.handlers import RotatingFileHandler

_loggers: dict = {}


def get_logger(name: str, log_file: str = "outreach/logs/outreach.log") -> logging.Logger:
    """
    Returns a logger that writes to both stdout and a rotating file.
    Caches by (name, log_file) to prevent duplicate handlers.
    """
    key = f"{name}::{log_file}"
    if key in _loggers:
        return _loggers[key]

    logger = logging.getLogger(key)
    logger.setLevel(logging.DEBUG)
    logger.propagate = False

    fmt = logging.Formatter(
        "%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    # Rotating file
    log_dir = os.path.dirname(log_file)
    if log_dir:
        os.makedirs(log_dir, exist_ok=True)
    fh = RotatingFileHandler(log_file, maxBytes=5 * 1024 * 1024, backupCount=3)
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    _loggers[key] = logger
    return logger
