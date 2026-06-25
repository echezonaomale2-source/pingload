"""Extract the circular P logo mark and generate in-app + app icon assets."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(
    r"C:\Users\Echezona\.cursor\projects\c-Users-Echezona-ping\assets"
    r"\c__Users_Echezona_AppData_Roaming_Cursor_User_workspaceStorage_57c7e0d51c94032c9e9ec151a5b65352_images_"
    r"1D95B268-B10E-498C-B09E-C317435F7E69-6017778c-726c-4703-b735-a7b7cf91b00c.png"
)

MOBILE_ASSETS = ROOT / "mobile" / "src" / "assets"
ADMIN_PUBLIC = ROOT / "admin" / "public"

BRAND_WHITE = (255, 255, 255, 255)


def is_brand_pixel(r: int, g: int, b: int) -> bool:
    """Keep blue/orange logo pixels; drop white background and black text."""
    if r > 245 and g > 245 and b > 245:
        return False
    if r < 60 and g < 60 and b < 60:
        return False

    blue_score = b - r
    orange_score = r - b

    is_blue = b > 90 and blue_score > 18 and g < b
    is_orange = r > 110 and orange_score > 25 and g < r
    return is_blue or is_orange


def extract_mark(source: Image.Image) -> Image.Image:
    w, h = source.size
    top = source.crop((0, 0, w, int(h * 0.38)))
    mask = Image.new("L", top.size, 0)
    mp = mask.load()
    tp = top.convert("RGBA").load()

    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(top.height):
        for x in range(top.width):
            r, g, b, _a = tp[x, y]
            if is_brand_pixel(r, g, b):
                mp[x, y] = 255
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)

    mark = top.convert("RGBA")
    mark.putalpha(mask)
    mark = mark.crop((minx, miny, maxx + 1, maxy + 1))

    side = max(mark.width, mark.height)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2), mark)
    return square


def upscale_mark(mark: Image.Image, target: int = 512) -> Image.Image:
    return mark.resize((target, target), Image.Resampling.LANCZOS)


def save_transparent_icon(source: Image.Image, dest: Path, size: int, padding: float = 0.06) -> None:
    """In-app logo — transparent background."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * (1 - padding * 2))
    scaled = source.resize((inner, inner), Image.Resampling.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(scaled, (offset, offset), scaled)
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest, "PNG", optimize=True)


def save_opaque_icon(
    source: Image.Image,
    dest: Path,
    size: int,
    padding: float = 0.14,
    background: tuple[int, int, int, int] = BRAND_WHITE,
) -> None:
    """App store / favicon — solid background, centered mark (no alpha)."""
    canvas = Image.new("RGBA", (size, size), background)
    inner = int(size * (1 - padding * 2))
    scaled = source.resize((inner, inner), Image.Resampling.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(scaled, (offset, offset), scaled)
    canvas.convert("RGB").save(dest, "PNG", optimize=True)


def main() -> None:
    if not SRC.exists():
        raise FileNotFoundError(f"Source splash image not found: {SRC}")

    source = Image.open(SRC).convert("RGBA")
    mark = extract_mark(source)
    mark_hd = upscale_mark(mark, 512)

    # In-app logo (transparent)
    save_transparent_icon(mark_hd, MOBILE_ASSETS / "logo.png", 512, padding=0.06)
    save_transparent_icon(mark_hd, ADMIN_PUBLIC / "logo.png", 512, padding=0.06)

    # App icons (opaque white — required for iOS / home screen)
    save_opaque_icon(mark_hd, MOBILE_ASSETS / "icon.png", 1024, padding=0.16)
    save_opaque_icon(mark_hd, MOBILE_ASSETS / "splash.png", 1024, padding=0.28)
    save_opaque_icon(mark_hd, ADMIN_PUBLIC / "favicon.png", 192, padding=0.14)
    save_opaque_icon(mark_hd, ADMIN_PUBLIC / "apple-touch-icon.png", 180, padding=0.14)

    # Android adaptive foreground — transparent with safe-zone padding
    save_transparent_icon(mark_hd, MOBILE_ASSETS / "adaptive-icon.png", 1024, padding=0.22)

    print(f"Extracted logo mark from {SRC.name}")
    print(f"Mark crop: {mark.size}px")
    print("Updated: logo.png (in-app), icon.png, adaptive-icon.png, splash.png, admin favicon")


if __name__ == "__main__":
    main()
