"""
ComfyUI Image Annotator Node
Supports point/rectangle/polygon annotations with output rendering
"""

from .nodes import ImageAnnotator

NODE_CLASS_MAPPINGS = {
    "ImageAnnotator": ImageAnnotator
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ImageAnnotator": "Luck Annotator"
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

