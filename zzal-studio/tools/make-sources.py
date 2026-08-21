# -*- coding: utf-8 -*-
"""증빙 촬영에 쓸 소재 이미지를 만듭니다. 전부 이 스크립트가 그린 자체 제작 이미지입니다."""
import os

from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "소재")
os.makedirs(OUT, exist_ok=True)

FONT = "C:/Windows/Fonts/malgun.ttf"
FONT_BD = "C:/Windows/Fonts/malgunbd.ttf"


def font(size, bold=False):
    return ImageFont.truetype(FONT_BD if bold else FONT, size)


# 1. 가로로 긴 자료 이미지 — 문구가 내용을 가리는 겹침 결함을 재현할 소재
def make_table():
    w, h = 1600, 420
    img = Image.new("RGB", (w, h), "#FFFFFF")
    d = ImageDraw.Draw(img)

    cols = [40, 300, 470, 700, 930, 1160, 1400, 1560]
    heads = ["사례", "위험 수준", "신원", "기기", "네트워크", "애플리케이션", "판정"]
    rows = [
        ["1. 인증 서버 침해", "높음", "광범위한 권한 부여", "정상 권한 의존", "내부 이동 허용", "경로 중심 보안", "거부"],
        ["2. 크리덴셜 스터핑", "중간", "ID/PW 단순 인증", "기기 검증 없음", "대량 요청 허용", "MFA 미적용", "거부"],
        ["3. 랜섬웨어 감염", "높음", "감염 계정 권한 남용", "악성 행위 탐지 실패", "평평한 내부망", "상호 격리 실패", "거부"],
    ]

    d.rectangle([0, 60, w, 110], fill="#EFEFEF")
    for i, head in enumerate(heads):
        d.text((cols[i] + 8, 74), head, font=font(20, True), fill="#222222")

    for r, row in enumerate(rows):
        y = 120 + r * 66
        d.line([0, y - 6, w, y - 6], fill="#CCCCCC", width=1)
        for i, cell in enumerate(row):
            d.text((cols[i] + 8, y + 12), cell, font=font(19), fill="#333333")

    d.line([0, 60, w, 60], fill="#AAAAAA", width=2)
    d.line([0, 120 + len(rows) * 66 - 6, w, 120 + len(rows) * 66 - 6], fill="#AAAAAA", width=2)
    for x in cols[:-1]:
        d.line([x, 60, x, 120 + len(rows) * 66 - 6], fill="#DDDDDD", width=1)

    d.text((40, 20), "제로 트러스트 점검표 (자체 제작 예시 자료)", font=font(22, True), fill="#111111")
    img.save(os.path.join(OUT, "자료표.png"))


# 2. 세로 이미지 — 화면비 잘림 검사용
def make_vertical():
    w, h = 1080, 1920
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        d.line([0, y, w, y], fill=(int(28 + 60 * t), int(24 + 120 * t), int(60 + 150 * t)))
    for i in range(14):
        y = 120 + i * 130
        d.ellipse([w // 2 - 300 + i * 12, y, w // 2 + 300 - i * 12, y + 90],
                  outline=(255, 255, 255, 40), width=2)
    d.text((70, 90), "세로 소재", font=font(64, True), fill="#FFFFFF")
    img.save(os.path.join(OUT, "세로소재.png"))
    img.convert("RGB").save(os.path.join(OUT, "세로소재.jpg"), quality=92)


# 3. 투명 배경 PNG — 투명 유지 검사용
def make_transparent():
    size = 900
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([80, 80, size - 80, size - 80], fill=(46, 176, 140, 255))
    d.ellipse([200, 200, size - 200, size - 200], fill=(255, 255, 255, 255))
    d.ellipse([300, 300, size - 300, size - 300], fill=(46, 176, 140, 255))
    img.save(os.path.join(OUT, "투명원.png"))


# 4. 지원하지 않는 파일 — 거부 동작 검사용
def make_unsupported():
    with open(os.path.join(OUT, "지원안함.svg"), "w", encoding="utf-8") as f:
        f.write('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')


make_table()
make_vertical()
make_transparent()
make_unsupported()
print("소재 생성 완료:", sorted(os.listdir(OUT)))
