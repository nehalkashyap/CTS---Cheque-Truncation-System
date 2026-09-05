"""
Signature quality analysis.

A production build of CTS would score signature images with a trained
model (see the architecture note in cheque_verification.py). For this
prototype we derive comparable scores from simple image statistics so the
UI and downstream risk engine can be built against a stable contract now.
"""
import io
from PIL import Image, ImageStat


def analyze_signature_image(file_bytes: bytes) -> dict:
    try:
        img = Image.open(io.BytesIO(file_bytes)).convert("L")
    except Exception:
        # Not a readable image — return a low, honest score rather than guessing.
        return {
            "clarity_score": 20.0,
            "stroke_score": 20.0,
            "contrast_score": 20.0,
            "background_score": 20.0,
            "quality_score": 20.0,
        }

    stat = ImageStat.Stat(img)
    stddev = stat.stddev[0] if stat.stddev[0] else 1.0
    histogram = img.histogram()
    total_pixels = sum(histogram) or 1
    white_pixels = sum(histogram[235:])
    dark_pixels = sum(histogram[:100])
    white_ratio = white_pixels / total_pixels
    ink_ratio = dark_pixels / total_pixels

    # Contrast: wider spread of pixel intensities implies better ink/background separation.
    has_clear_ink = white_ratio >= 0.7 and 0.0001 <= ink_ratio <= 0.3
    contrast_score = 92.0 if has_clear_ink else min(100.0, max(15.0, (stddev / 65.0) * 100))

    # Background cleanliness: a background-heavy image skews the mean bright (near-white)
    # or dark; we reward means that suggest a mostly-plain background with visible ink.
    background_score = min(100.0, max(20.0, white_ratio * 115))

    # Clarity: proxied by resolution — larger, sharper uploads score higher.
    width, height = img.size
    pixel_count = width * height
    clarity_score = min(99.0, max(25.0, 55 + (pixel_count / 500000) * 30))

    # Stroke consistency: heuristic combining contrast + a bounded random component to
    # emulate natural variation until a Siamese-network stroke model is wired in.
    stroke_score = min(98.0, max(20.0, contrast_score * 0.65 + (90 if has_clear_ink else 55) * 0.35))

    quality_score = round(
        (clarity_score * 0.3) + (stroke_score * 0.25) + (contrast_score * 0.25) + (background_score * 0.2),
        1,
    )

    return {
        "clarity_score": round(clarity_score, 1),
        "stroke_score": round(stroke_score, 1),
        "contrast_score": round(contrast_score, 1),
        "background_score": round(background_score, 1),
        "quality_score": quality_score,
    }


def verdict_for_score(score: float) -> tuple[str, list[str]]:
    if score >= 80:
        return "Good quality signature", []
    if score >= 60:
        return "Acceptable, but could be clearer", [
            "Use a plain white background",
            "Avoid shadows across the signature",
        ]
    return "Your signature is difficult to analyze.", [
        "Use a plain white background",
        "Avoid shadows",
        "Use dark ink",
        "Keep the signature centered",
        "Upload a higher-resolution image",
    ]
