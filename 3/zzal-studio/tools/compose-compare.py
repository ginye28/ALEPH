# -*- coding: utf-8 -*-
"""미리보기 화면과 내려받은 파일을 나란히 붙여 비교 이미지를 만듭니다."""
import os

from PIL import Image, ImageChops, ImageDraw, ImageFont

SHOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "짤카드 증빙 화면")
SHOT = os.path.abspath(SHOT)

FONT_BD = "C:/Windows/Fonts/malgunbd.ttf"
FONT = "C:/Windows/Fonts/malgun.ttf"

preview = Image.open(os.path.join(SHOT, "08a_미리보기영역.png")).convert("RGB")
saved = Image.open(os.path.join(SHOT, "08b_저장파일.png")).convert("RGB")

# 두 이미지를 같은 높이로 맞춰 나란히 놓습니다.
H = 900
def fit(img):
    w = round(img.width * H / img.height)
    return img.resize((w, H), Image.LANCZOS)

left, right = fit(preview), fit(saved)

# 배치가 같은지 수치로도 확인합니다.
diff = ImageChops.difference(left, right)
mean = sum(sum(band.histogram()[i] * i for i in range(256)) for band in diff.split()) / (left.width * H * 3)

pad, gap, top = 40, 60, 130
W = pad * 2 + left.width + gap + right.width
canvas = Image.new("RGB", (W, top + H + 150), "#FFFFFF")
d = ImageDraw.Draw(canvas)

d.text((pad, 34), "미리보기 화면과 내려받은 파일 비교", font=ImageFont.truetype(FONT_BD, 34), fill="#111114")
d.text((pad, 82), f"같은 설정에서 화면에 보이는 미리보기와 실제로 내려받은 PNG를 같은 높이로 맞춰 나란히 놓았습니다. "
                  f"평균 화소 차이 {mean:.2f}/255.", font=ImageFont.truetype(FONT, 22), fill="#5F5760")

canvas.paste(left, (pad, top))
canvas.paste(right, (pad + left.width + gap, top))

label = ImageFont.truetype(FONT_BD, 26)
small = ImageFont.truetype(FONT, 20)
d.text((pad, top + H + 20), "① 미리보기 화면", font=label, fill="#A81854")
d.text((pad, top + H + 56), f"화면 표시 크기 {preview.width} × {preview.height}px", font=small, fill="#5F5760")

rx = pad + left.width + gap
d.text((rx, top + H + 20), "② 내려받은 파일", font=label, fill="#A81854")
d.text((rx, top + H + 56), f"저장 크기 {saved.width} × {saved.height}px (4:5)", font=small, fill="#5F5760")

for x, w in ((pad, left.width), (rx, right.width)):
    d.rectangle([x - 1, top - 1, x + w, top + H], outline="#C9C1C7", width=1)

out = os.path.join(SHOT, "08_저장파일_비교.png")
canvas.save(out)
print(f"생성: {out}")
print(f"미리보기 {preview.size} · 저장 파일 {saved.size} · 평균 화소 차이 {mean:.3f}/255")
