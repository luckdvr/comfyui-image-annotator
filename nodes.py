"""
ComfyUI Image Annotator Node - Backend Logic (V8.2)
"""

import json
import os
import numpy as np
import torch
from PIL import Image, ImageDraw, ImageFont


class ImageAnnotator:
    def __init__(self):
        # Print current file path for debugging which version is loaded
        print(f"### [ImageAnnotator] Node source loaded from: {os.path.abspath(__file__)}")
        self._font_cache = {}  # Cache fonts by size for performance

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": { "image": ("IMAGE",), },
            "optional": {
                "mark_data": ("STRING", { "default": "", "multiline": True, }),
            },
            "hidden": { "unique_id": "UNIQUE_ID", }
        }
    
    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("image_out", "mark_data")
    FUNCTION = "annotate"
    CATEGORY = "image/annotation"
    
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    def annotate(self, image, mark_data="", unique_id=None):
        print(f"### [ImageAnnotator] Processing annotation data, node path: {os.path.abspath(__file__)}")
        
        if isinstance(image, torch.Tensor):
            img_np = (image[0].cpu().numpy() * 255).astype(np.uint8)
            pil_image = Image.fromarray(img_np)
        else:
            pil_image = Image.fromarray(image)
        
        marks = []
        output_mark_data = mark_data
        
        if mark_data and mark_data.strip():
            try:
                data = json.loads(mark_data)
                marks = data.get("marks", [])
            except Exception as e:
                print(f"### [ImageAnnotator] JSON parse failed: {e}")
                marks = []
        
        if not output_mark_data or not output_mark_data.strip():
            output_mark_data = json.dumps({
                "version": "1.0",
                "image_size": [pil_image.width, pil_image.height],
                "marks": []
            }, ensure_ascii=False, indent=2)
        
        if marks:
            pil_image = self._render_marks(pil_image, marks)
        
        img_np = np.array(pil_image).astype(np.float32) / 255.0
        img_tensor = torch.from_numpy(img_np).unsqueeze(0)
        
        return (img_tensor, output_mark_data)
    
    def _render_marks(self, image: Image.Image, marks: list) -> Image.Image:
        if image.mode != "RGBA":
            image = image.convert("RGBA")
        
        overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        
        for idx, mark in enumerate(marks, start=1):
            if not mark.get("visible", True):
                continue
                
            mark_type = mark.get("type", "point")
            points = mark.get("points", [])
            style = mark.get("style", {})
            label = mark.get("label", "")
            
            # Use safer defensive logic to prevent None causing lstrip crash
            stroke_color = style.get("stroke_color") or "#22C55E"
            stroke_width = style.get("stroke_width", 2)
            fill_color = style.get("fill_color") or stroke_color
            fill_alpha = style.get("fill_alpha", 0.35)
            font_size = style.get("font_size", 12)
            
            point_size = style.get("point_size", 12)
            show_stroke = style.get("show_stroke", True)
            show_fill = style.get("show_fill", True)
            
            stroke_rgba = self._hex_to_rgba(stroke_color, 255)
            fill_rgba = self._hex_to_rgba(fill_color, int(fill_alpha * 255))
            
            if mark_type == "point":
                if len(points) < 1:
                    continue
                self._draw_point(draw, points, stroke_rgba, fill_rgba, stroke_width, str(idx), point_size, show_fill, show_stroke)
                lx, ly = points[0]
            elif mark_type == "rect":
                if len(points) < 2:
                    continue
                self._draw_rect(draw, points, stroke_rgba, fill_rgba, stroke_width, show_fill, show_stroke)
                x = min(points[0][0], points[1][0])
                y = min(points[0][1], points[1][1])
                w = abs(points[1][0] - points[0][0])
                h = abs(points[1][1] - points[0][1])
                lx, ly = x + w / 2, y + h / 2
            elif mark_type == "polygon":
                if len(points) < 3:
                    continue
                self._draw_polygon(draw, points, stroke_rgba, fill_rgba, stroke_width, show_fill, show_stroke)
                # Calculate centroid
                lx = sum(p[0] for p in points) / len(points)
                ly = sum(p[1] for p in points) / len(points)
            else:
                continue
            
            # Draw index number (Refined: Rectangle and Polygon use centered numbers)
            if mark_type != "point":
                fontSize = int(point_size * 1.2)
                self._draw_centered_text(draw, lx, ly, str(idx), fontSize)
        
        result = Image.alpha_composite(image, overlay)
        return result.convert("RGB")
    
    def _hex_to_rgba(self, hex_color, alpha: int) -> tuple:
        """Convert hex color to RGBA with defensive programming"""
        default = (34, 197, 94, alpha)

        if not isinstance(hex_color, str) or not hex_color:
            return default

        hex_color = hex_color.lstrip("#")
        if len(hex_color) == 3:
            hex_color = "".join([c * 2 for c in hex_color])

        if len(hex_color) != 6:
            return default

        try:
            r = int(hex_color[0:2], 16)
            g = int(hex_color[2:4], 16)
            b = int(hex_color[4:6], 16)
            return (r, g, b, alpha)
        except ValueError:
            return default

    def _get_font(self, size):
        """Get font with caching for performance"""
        if size in self._font_cache:
            return self._font_cache[size]

        font_candidates = [
            # macOS
            "/System/Library/Fonts/PingFang.ttc",
            "/System/Library/Fonts/Helvetica.ttc",
            "/Library/Fonts/Arial.ttf",
            # Windows
            "C:/Windows/Fonts/msyh.ttc",
            "C:/Windows/Fonts/simhei.ttf",
            "C:/Windows/Fonts/arial.ttf",
            # Linux
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
        ]

        font = None
        for font_path in font_candidates:
            try:
                if os.path.exists(font_path):
                    font = ImageFont.truetype(font_path, size)
                    break
            except:
                continue

        if font is None:
            try:
                font = ImageFont.load_default()
            except:
                font = None

        self._font_cache[size] = font
        return font
    
    def _draw_point(self, draw: ImageDraw.Draw, points, stroke_rgba, fill_rgba, stroke_width, text, point_size, show_fill=True, show_stroke=True):
        if not points: return
        x, y = points[0]
        radius = point_size
        if show_fill:
            draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=fill_rgba)
        if show_stroke:
            draw.ellipse([x - radius, y - radius, x + radius, y + radius], outline=stroke_rgba, width=stroke_width)

        # Match frontend: draw index badge inside point (using stroke color)
        badge_r = max(8, int(radius * 0.85))
        draw.ellipse([x - badge_r, y - badge_r, x + badge_r, y + badge_r], fill=stroke_rgba)
        draw.ellipse(
            [x - badge_r, y - badge_r, x + badge_r, y + badge_r],
            outline=(255, 255, 255, 255),
            width=max(1, int(stroke_width))
        )
        self._draw_centered_text(draw, x, y, text, max(9, int(badge_r * 1.1)))
    
    def _draw_centered_text(self, draw: ImageDraw.Draw, x, y, text, radius):
        """Draw centered text with cached font"""
        fs = max(8, int(radius * 1.2))
        font = self._get_font(fs)

        text_color = (255, 255, 255, 255)
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((x - tw/2, y - th/2 - 1), text, font=font, fill=text_color)

    def _draw_rect(self, draw: ImageDraw.Draw, points, stroke_rgba, fill_rgba, stroke_width, show_fill=True, show_stroke=True):
        if len(points) < 2: return
        p1, p2 = points[0], points[1]
        l, r = min(p1[0], p2[0]), max(p1[0], p2[0])
        t, b = min(p1[1], p2[1]), max(p1[1], p2[1])
        f_color = fill_rgba if show_fill else None
        o_color = stroke_rgba if show_stroke else None
        draw.rectangle([l, t, r, b], fill=f_color, outline=o_color, width=stroke_width)

    def _draw_polygon(self, draw: ImageDraw.Draw, points, stroke_rgba, fill_rgba, stroke_width, show_fill=True, show_stroke=True):
        if len(points) < 3: return
        pts = [(p[0], p[1]) for p in points]
        f_color = fill_rgba if show_fill else None
        o_color = stroke_rgba if show_stroke else None
        draw.polygon(pts, fill=f_color, outline=o_color)
        if show_stroke:
            for i in range(len(pts)):
                draw.line([pts[i], pts[(i+1)%len(pts)]], fill=stroke_rgba, width=stroke_width)
