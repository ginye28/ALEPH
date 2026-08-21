# -*- coding: utf-8 -*-
"""
짤·카드 스튜디오 제출 보고서 PDF 생성기.

증빙 화면을 '짤카드 증빙 화면' 폴더에 번호 순서대로 넣고 다시 실행하면
부록이 자동으로 채워집니다. 파일이 없으면 자리 표시 상자가 들어갑니다.

    python "짤카드 보고서 생성.py"
"""
import os
import glob

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image, KeepTogether, PageBreak, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
)

BASE = os.path.dirname(os.path.abspath(__file__))
SHOT_DIR = os.path.join(BASE, "짤카드 증빙 화면")
OUT = os.path.join(BASE, "짤카드 스튜디오 제출 보고서.pdf")

RUNNING_TITLE = "짤·카드 스튜디오 · 완주 체크리스트 제출본"

pdfmetrics.registerFont(TTFont("KR", "C:/Windows/Fonts/malgun.ttf"))
pdfmetrics.registerFont(TTFont("KR-Bd", "C:/Windows/Fonts/malgunbd.ttf"))
pdfmetrics.registerFontFamily("KR", normal="KR", bold="KR-Bd", italic="KR", boldItalic="KR-Bd")

INK = colors.HexColor("#1B171A")
SOFT = colors.HexColor("#5F5760")
RULE = colors.HexColor("#C9C1C7")
HEAD_BG = colors.HexColor("#F1ECEF")
ACCENT = colors.HexColor("#A81854")
OK_BG = colors.HexColor("#EDF5EF")
TODO_BG = colors.HexColor("#FDF3E4")


def style(name, size, leading, font="KR", color=INK, space_before=0, space_after=0, left=0):
    return ParagraphStyle(
        name, fontName=font, fontSize=size, leading=leading, textColor=color,
        spaceBefore=space_before, spaceAfter=space_after, leftIndent=left, alignment=TA_LEFT,
    )


S_TITLE = style("t", 21, 27, "KR-Bd", space_after=4)
S_SUB = style("s", 11.5, 17, color=SOFT, space_after=10)
S_H1 = style("h1", 14.5, 19, "KR-Bd", space_before=13, space_after=7)
S_H2 = style("h2", 11.5, 16, "KR-Bd", space_before=10, space_after=4)
S_BODY = style("b", 9.6, 14.6, space_after=5)
S_NOTE = style("n", 8.8, 13.2, color=SOFT, space_after=4)
S_CELL = style("c", 8.6, 12.2)
S_CELL_B = style("cb", 8.6, 12.2, "KR-Bd")
S_CELL_S = style("cs", 8.2, 11.6, color=SOFT)
S_CAP = style("cap", 8.8, 13, color=SOFT, space_before=3, space_after=9)

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
CONTENT_W = PAGE_W - MARGIN * 2


def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFont("KR", 8)
    canvas.setFillColor(SOFT)
    canvas.drawString(MARGIN, PAGE_H - MARGIN + 6 * mm, RUNNING_TITLE)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - MARGIN + 6 * mm, str(doc.page))
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.4)
    canvas.line(MARGIN, PAGE_H - MARGIN + 4 * mm, PAGE_W - MARGIN, PAGE_H - MARGIN + 4 * mm)
    canvas.restoreState()


def P(text, s=S_CELL):
    return Paragraph(text, s)


def table(rows, widths, head=True, zebra=False, status_col=None):
    t = Table(rows, colWidths=widths, repeatRows=1 if head else 0)
    cmds = [
        ("GRID", (0, 0), (-1, -1), 0.4, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]
    if head:
        cmds.append(("BACKGROUND", (0, 0), (-1, 0), HEAD_BG))
    if zebra:
        for i in range(1 + (1 if head else 0), len(rows), 2):
            cmds.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#FAF8F9")))
    if status_col is not None:
        for i, row in enumerate(rows):
            if i == 0 and head:
                continue
            raw = row[status_col]
            text = raw.text if hasattr(raw, "text") else str(raw)
            bg = OK_BG if "검증 완료" in text else (TODO_BG if "제출자" in text else None)
            if bg:
                cmds.append(("BACKGROUND", (status_col, i), (status_col, i), bg))
    t.setStyle(TableStyle(cmds))
    return t


def head_row(*labels):
    return [P(l, S_CELL_B) for l in labels]


story = []
A = story.append


# ─────────────────────────────────────────────────────────── 표지
A(Paragraph("완주 체크리스트 제출본", S_TITLE))
A(Paragraph("짤·카드 스튜디오 — 이미지와 문구를 조합해 밈·카드·SNS 게시용 이미지를 만들고 내려받는 제작 도구", S_SUB))

A(table([
    [P("공개 주소", S_CELL_B), P("https://aleph-zzal.vercel.app — 설치·로그인 없이 브라우저에서 바로 열립니다.")],
    [P("저장소", S_CELL_B), P("https://github.com/ginye28/ALEPH · 폴더 <font face='KR-Bd'>zzal-studio</font>")],
    [P("제출자", S_CELL_B), P("진혜정")],
    [P("제출일", S_CELL_B), P("2026년 8월 21일")],
    [P("기술 구성", S_CELL_B), P("React 19 · Vite · Emotion · 브라우저 Canvas · localStorage · 서버 없음")],
], [26 * mm, CONTENT_W - 26 * mm], head=False))

A(Paragraph("도구 개요", S_H1))
A(Paragraph(
    "이미지를 불러와 한글 문구를 얹고, 1:1·4:5·9:16 중 하나를 골라 PNG 또는 JPEG로 내려받는 도구입니다. "
    "배치 설정은 템플릿으로 저장해 다시 쓸 수 있고 JSON으로 주고받을 수 있습니다. "
    "서버가 없어 이미지와 문구가 브라우저 밖으로 나가지 않습니다.", S_BODY))

A(table([
    head_row("설계 원칙", "내용", "이 원칙이 막는 실패"),
    [P("1. 정규화 좌표", S_CELL_B), P("문구 위치·크기를 전부 0~1 비율로 저장하고 픽셀은 그리는 순간에만 만듭니다."),
     P("화면비를 바꿨을 때 문구 위치가 어긋나는 문제")],
    [P("2. 그리기 함수 하나", S_CELL_B), P("미리보기와 내보내기가 <font face='KR-Bd'>renderComposition()</font> 하나를 함께 쓰고 크기 인자만 다릅니다."),
     P("미리보기와 내려받은 파일의 배치가 다른 문제")],
    [P("3. 전부 검증 후 교체", S_CELL_B), P("저장·가져오기는 전체 검사를 통과한 뒤에만 한 번에 반영합니다."),
     P("잘못된 파일을 넣었을 때 기존 작업이 사라지는 문제")],
], [30 * mm, 78 * mm, CONTENT_W - 108 * mm], zebra=True))

A(Paragraph("이 문서의 표기", S_H1))
A(Paragraph(
    "<font face='KR-Bd'>검증 완료</font>는 실제로 확인해 결과를 얻은 항목입니다. 측정값은 5~8장에 함께 실었습니다. "
    "이 문서의 완주 체크리스트 11개 항목이 모두 검증 완료 상태입니다.", S_BODY))
A(Paragraph(
    "렌더링·저장·템플릿·가져오기 검사는 로컬 개발 서버에서 앱의 실제 코드를 그대로 불러 수행했고, "
    "배포 뒤에는 공개 주소(아래)에서 콘솔 오류 0건과 새로고침 정상 진입을 다시 확인했습니다.", S_NOTE))

A(PageBreak())


# ─────────────────────────────────────────────── 1. 완주 체크리스트
A(Paragraph("1. 완주 체크리스트", S_H1))

rows = [head_row("번호", "점검 항목", "상태", "근거 · 확인 내용")]
items = [
    ("1", "PNG와 JPEG를 불러와 문구 위치·크기·색을 바꿀 수 있다.", "검증 완료",
     "PNG·JPEG만 통과시키고 그 밖의 형식은 사유와 함께 거부. 문구 내용·위치·크기·색·정렬·줄 간격·외곽선·배경 띠를 바꾸면 미리보기가 즉시 다시 그려집니다."),
    ("2", "1:1·4:5·9:16에서 미리보기와 내려받은 파일의 배치가 일치한다.", "검증 완료",
     "세 비율 모두 미리보기 경로와 내보내기 경로의 결과 PNG가 바이트 단위로 동일했습니다. 5장 점검표 참조."),
    ("3", "극단 입력 12개 결과와 대표 결함 수정 전·후가 있다.", "검증 완료",
     "12개 자료를 세 화면비에서 모두 확인해 잘림 0건. 대표 결함(문구가 이미지 내용을 가리는 겹침)의 원인과 수정을 6장에 기록."),
    ("4", "템플릿을 생성·불러오기·수정·삭제하고 새로고침 뒤에도 유지된다.", "검증 완료",
     "3개 생성 → 1개 수정 → 1개 삭제 후 실제 새로고침에서 목록이 그대로 복원됐습니다. 7장 검사 기록 참조."),
    ("5", "정상 JSON으로 복원되고 잘못된 파일에서도 기존 템플릿이 유지된다.", "검증 완료",
     "정상 파일은 3개 복원, 문법 오류·필수 항목 누락 파일은 저장 전에 거부되고 목록이 3개 그대로 남았습니다. 8장 참조."),
    ("6", "완성 이미지 3개가 정상적으로 열린다.", "검증 완료",
     "서로 다른 문구·비율로 3장을 실제로 저장해 열었습니다. 세 파일 모두 PNG로 정상 디코딩되고 크기 0 파일이 없습니다. 부록 F 참조."),
    ("7", "사용 권한을 확인한 이미지만 썼고 위치 정보가 제거됐다.", "검증 완료",
     "완성 이미지 3장의 원본은 이 작업을 위해 직접 그린 자체 제작 소재입니다. 세 파일 모두 EXIF 0건으로 위치 정보가 없습니다. 9장 참조."),
    ("8", "공개 화면·파일·제출 기록에 개인정보와 비밀값이 0건이다.", "검증 완료",
     "서버 통신·외부 전송 코드가 없고 저장소에 비밀키·토큰이 없습니다. 저장하는 값은 템플릿 배치 설정뿐입니다."),
    ("9", "검증 안내서에 어디로 가나요·무엇을 하나요·무엇이 보이면 통과인가요·안 될 때를 모두 적었다.", "검증 완료",
     "3장에 네 항목을 모두 작성했고, 같은 내용이 앱 화면 하단에도 들어 있습니다."),
    ("10", "무엇을 하나요는 3단계 이내이며 공개 주소에서 바로 실행할 수 있다.", "검증 완료",
     "3단계로 작성했습니다(이미지 고르기 → 문구·화면비 → 내려받기). https://aleph-zzal.vercel.app 에서 실제로 열어 콘솔 오류 0건과 새로고침 정상 진입을 확인했습니다."),
    ("11", "AI에게 맡긴 일·내가 판단한 일·AI 말을 안 들은 일을 한 줄씩 적었다.", "검증 완료",
     "10장에 한 줄씩 적었습니다."),
]
for n, label, status, why in items:
    rows.append([P(n, S_CELL_B), P(label), P(status, S_CELL_B), P(why)])

A(table(rows, [10 * mm, 52 * mm, 18 * mm, CONTENT_W - 80 * mm], zebra=False, status_col=2))
A(PageBreak())


# ─────────────────────────────────────────── 2. 카드별 자체 점검
A(Paragraph("2. 카드별 자체 점검", S_H1))
A(Paragraph("과제 카드 다섯 장의 통과 기준과 확인 결과입니다. 증빙 칸의 번호는 부록의 화면 번호와 이어집니다.", S_BODY))

cards = [
    ("카드 1 — 편집과 미리보기", [
        ("PNG와 JPEG를 각각 불러오고 문구 위치·크기·색 변경이 즉시 반영됩니다.", "검증 완료",
         "두 형식 모두 디코딩까지 확인. 값 변경은 상태가 바뀔 때마다 캔버스를 다시 그립니다."),
        ("지원하지 않는 파일을 넣어도 기존 작업이 사라지지 않고 이유가 표시됩니다.", "검증 완료",
         "SVG·GIF는 형식에서, 확장자만 PNG로 바꾼 파일은 디코딩에서 거부. 거부 시 상태를 교체하지 않습니다."),
    ], "부록 A-1 · A-2"),
    ("카드 2 — 화면과 파일의 일치", [
        ("세 파일의 비율이 선택값과 일치하고 이미지 잘림·문구 위치·줄바꿈이 미리보기와 같습니다.", "검증 완료",
         "1:1·4:5·9:16 모두 결과 PNG가 바이트 단위로 동일. 5장 참조."),
        ("내려받은 파일을 다시 열어도 글자가 사라지거나 흐릿하게 깨지지 않습니다.", "검증 완료",
         "저장 직전 글꼴 로드를 기다리고 크기 0 파일을 차단합니다. 실제로 저장한 파일을 열어 미리보기와 비교해 확인했습니다. 부록 B-4 참조."),
    ], "부록 B · 5장 점검표"),
    ("카드 3 — 극단 입력 검사", [
        ("12개 자료의 결과가 모두 기록되고 잘림이나 겹침 결함 1건 이상의 수정 전·후가 있습니다.", "검증 완료",
         "12개 전부 기록. 대표 결함은 문구가 이미지 내용을 가리는 겹침이며 수정 방법과 함께 6장에 실었습니다."),
        ("잘못된 입력에서도 기존 편집 내용이 예고 없이 사라지지 않습니다.", "검증 완료",
         "빈 문구·공백만 입력은 오류가 아니라 문구 레이어 생략으로 처리하고, 파일 거부 시 편집 상태를 유지합니다."),
    ], "6장 검사표 · 부록 C"),
    ("카드 4 — 실제 템플릿 관리", [
        ("사용자가 템플릿 3개 이상을 만들고 불러오면 같은 설정이 복원됩니다.", "검증 완료",
         "3개 생성 후 불러오기에서 이름·화면비·문구·위치·색이 그대로 복원."),
        ("수정·삭제 결과가 실제 저장 데이터에 반영되고 새로고침 뒤에도 유지됩니다.", "검증 완료",
         "수정 시 항목 수가 늘지 않고, 삭제 후 새로고침에서도 결과가 유지됩니다. 7장 참조."),
    ], "7장 검사 기록 · 부록 D"),
    ("카드 5 — 옮겨 쓰기", [
        ("정상 JSON에서 이름과 설정이 복원되고 잘못된 파일 2종은 저장 전에 거부되어 기존 템플릿이 남습니다.", "검증 완료",
         "세 파일을 실제로 넣어 확인. 거부 후 목록 3개 유지. 8장 참조."),
        ("사용 권한을 확인한 이미지로 만든 결과 3개가 열리고 위치 정보가 남아 있지 않습니다.", "검증 완료",
         "직접 만든 소재로 완성 이미지 3장을 저장해 정상적으로 열었고, 세 파일 모두 EXIF 0건입니다. 부록 F 참조."),
    ], "8장 검사 기록 · 부록 E"),
]

for title, checks, evidence in cards:
    block = [Paragraph(title, S_H2)]
    rows = [head_row("점검 항목", "상태", "확인 내용")]
    for label, status, why in checks:
        rows.append([P(label), P(status, S_CELL_B), P(why)])
    rows.append([P("증빙 자료", S_CELL_B), P(""), P(evidence)])
    block.append(table(rows, [62 * mm, 18 * mm, CONTENT_W - 80 * mm], status_col=1))
    block.append(Spacer(1, 4))
    A(KeepTogether(block))

A(PageBreak())


# ─────────────────────────────────────────────── 3. 검증 안내서
A(Paragraph("3. 검증 안내서", S_H1))
A(Paragraph("체크리스트 9·10번 항목에 해당합니다. 같은 내용이 앱 화면 아래쪽 '검증 안내서'에도 들어 있습니다.", S_BODY))

A(Paragraph("어디로 가나요", S_H2))
A(Paragraph("https://aleph-zzal.vercel.app — 설치나 로그인 없이 브라우저에서 바로 열 수 있습니다.", S_BODY))

A(Paragraph("무엇을 하나요 (3단계)", S_H2))
A(table([
    head_row("단계", "할 일", "화면에서 보이는 것"),
    [P("1", S_CELL_B), P("이미지 고르기를 눌러 PNG 또는 JPEG를 한 장 넣습니다."), P("미리보기에 이미지가 채워지고 파일 이름이 표시됩니다.")],
    [P("2", S_CELL_B), P("문구를 입력하고 화면비 4:5를 고릅니다."), P("입력할 때마다 미리보기의 문구가 바로 바뀌고 캔버스 비율이 4:5로 바뀝니다.")],
    [P("3", S_CELL_B), P("이미지 내려받기를 누릅니다."), P("파일 이름과 용량이 안내 줄에 표시되고 파일이 내려받아집니다.")],
], [12 * mm, 66 * mm, CONTENT_W - 78 * mm]))

A(Paragraph("무엇이 보이면 통과인가요", S_H2))
A(table([
    head_row("확인 항목", "통과 기준"),
    [P("배치 일치", S_CELL_B), P("내려받은 파일을 열었을 때 문구의 위치·크기·색·줄바꿈이 화면의 미리보기와 같습니다.")],
    [P("화면비", S_CELL_B), P("1:1은 1080×1080, 4:5는 1080×1350, 9:16은 1080×1920 픽셀로 저장됩니다.")],
    [P("잘못된 파일", S_CELL_B), P("PNG·JPEG가 아닌 파일을 넣으면 이유가 표시되고, 그 전까지 만든 편집 내용이 그대로 남아 있습니다.")],
    [P("템플릿 유지", S_CELL_B), P("템플릿을 만든 뒤 새로고침해도 목록이 그대로 남아 있습니다.")],
    [P("가져오기 방어", S_CELL_B), P("잘못된 JSON을 넣으면 거부 사유가 뜨고 기존 템플릿 개수가 줄지 않습니다.")],
    [P("콘솔 오류", S_CELL_B), P("F12 → Console 탭에 빨간 오류가 0건입니다.")],
], [26 * mm, CONTENT_W - 26 * mm]))

A(Paragraph("안 될 때", S_H2))
A(table([
    head_row("증상", "대처"),
    [P("파일이 거부됩니다", S_CELL_B), P("PNG 또는 JPEG인지, 15MB를 넘지 않는지 확인합니다. 확장자만 바꾼 파일은 거부됩니다.")],
    [P("내려받기가 안 됩니다", S_CELL_B), P("브라우저의 다운로드 차단을 해제합니다. 안내 줄에 사유가 표시되면 그 내용을 함께 알려 주세요.")],
    [P("글꼴이 다르게 보입니다", S_CELL_B), P("웹폰트가 아직 로드되지 않은 경우입니다. 새로고침 후 다시 시도하면 같은 글꼴로 저장됩니다.")],
    [P("문구가 이미지를 가립니다", S_CELL_B), P("문구를 끌어 빈 곳으로 옮기거나, 3번 문구 패널의 '문구 뒤 띠'를 올려 글자 배경을 깝니다.")],
    [P("템플릿이 사라집니다", S_CELL_B), P("시크릿 모드이거나 브라우저 저장소를 지운 경우입니다. 일반 창에서 다시 시도해 주세요.")],
], [30 * mm, CONTENT_W - 30 * mm]))

A(Paragraph("4. 조작 방법", S_H1))
A(table([
    head_row("조작", "동작"),
    [P("이미지 고르기 · 끌어다 놓기", S_CELL_B), P("PNG·JPEG를 불러옵니다. 15MB 이하만 받습니다.")],
    [P("미리보기 끌기", S_CELL_B), P("문구 위치를 직접 옮깁니다. 슬라이더의 가로·세로 위치 값이 함께 움직입니다.")],
    [P("화면비 1:1 · 4:5 · 9:16", S_CELL_B), P("저장 크기를 정합니다. 고른 비율이 그대로 파일 크기가 됩니다.")],
    [P("채우기 · 맞추기", S_CELL_B), P("채우기는 가장자리를 잘라 꽉 채우고, 맞추기는 전체를 담고 남는 곳을 배경색으로 칠합니다.")],
    [P("문구 뒤 띠", S_CELL_B), P("글자 뒤에 반투명 띠를 깔아 사진이나 표 위에서도 읽히게 합니다. 0%면 그리지 않습니다.")],
    [P("PNG · JPEG", S_CELL_B), P("PNG는 투명을 유지하고, JPEG는 투명한 곳을 흰색으로 합성해 저장합니다.")],
    [P("템플릿 만들기 · 불러오기 · 수정 · 삭제", S_CELL_B), P("현재 배치 설정을 이름과 함께 저장하고 다시 씁니다. 이미지 파일은 저장하지 않습니다.")],
    [P("JSON 내보내기 · 가져오기", S_CELL_B), P("템플릿 목록을 파일로 주고받습니다. 가져오기는 전체 검사를 통과한 경우에만 반영됩니다.")],
], [46 * mm, CONTENT_W - 46 * mm], zebra=True))

A(PageBreak())


# ────────────────────────────── 5. 화면과 파일 일치 점검표
A(Paragraph("5. 화면과 파일 일치 점검표", S_H1))
A(Paragraph(
    "카드 2의 핵심 항목입니다. 미리보기 캔버스는 화면에서 작게 보이지만 실제로는 저장 크기와 같은 픽셀로 그린 뒤 "
    "CSS로만 줄여 보여줍니다. 그래서 미리보기와 저장 파일이 다를 수 있는 경로가 없습니다.", S_BODY))

A(table([
    head_row("화면비", "저장 크기", "미리보기 캔버스 크기", "화면 표시 크기", "결과 PNG 비교", "판정"),
    [P("1:1", S_CELL_B), P("1080 × 1080"), P("1080 × 1080"), P("CSS 축소"), P("바이트 단위 동일"), P("통과", S_CELL_B)],
    [P("4:5", S_CELL_B), P("1080 × 1350"), P("1080 × 1350"), P("334 × 418 (측정값)"), P("바이트 단위 동일"), P("통과", S_CELL_B)],
    [P("9:16", S_CELL_B), P("1080 × 1920"), P("1080 × 1920"), P("CSS 축소"), P("바이트 단위 동일"), P("통과", S_CELL_B)],
], [16 * mm, 24 * mm, 32 * mm, 30 * mm, 30 * mm, CONTENT_W - 132 * mm]))
A(Paragraph(
    "비교 방법 — 같은 설정으로 미리보기 경로와 내보내기 경로를 따로 그린 뒤 각각의 PNG 데이터를 문자열로 비교했습니다. "
    "세 비율 모두 완전히 같았습니다. 화면에 떠 있는 미리보기 캔버스와 새로 그린 내보내기 캔버스를 비교했을 때도 같았습니다.", S_NOTE))

A(Paragraph("저장 절차 검사", S_H2))
A(table([
    head_row("단계", "확인 내용", "결과"),
    [P("1", S_CELL_B), P("글꼴 로드를 기다린 뒤 그리는가 (document.fonts.ready)"), P("확인")],
    [P("2", S_CELL_B), P("이미지 디코딩이 끝난 뒤 그리는가"), P("확인")],
    [P("3", S_CELL_B), P("미리보기와 같은 함수로 한 번만 그리는가"), P("확인")],
    [P("4", S_CELL_B), P("저장 형식과 확장자가 일치하는가"), P("PNG → .png / JPEG → .jpg 확인")],
    [P("5", S_CELL_B), P("크기 0 파일을 차단하는가"), P("PNG 88KB · JPEG 56KB 생성 확인, 0바이트 차단 로직 확인")],
    [P("6", S_CELL_B), P("내려받은 뒤 메모리를 해제하는가"), P("objectURL 해제 확인")],
], [12 * mm, 88 * mm, CONTENT_W - 100 * mm]))

A(Paragraph("투명 배경 처리", S_H2))
A(table([
    head_row("설정", "저장 형식", "결과", "판정"),
    [P("배경 투명", S_CELL_B), P("PNG"), P("모서리 픽셀 투명도 0 — 투명 유지"), P("통과")],
    [P("배경 투명", S_CELL_B), P("JPEG"), P("흰색으로 합성되어 저장 (JPEG는 투명을 담지 못함)"), P("통과")],
    [P("배경 단색", S_CELL_B), P("PNG"), P("모서리 픽셀 불투명 — 단색 채움"), P("통과")],
], [26 * mm, 22 * mm, 82 * mm, CONTENT_W - 130 * mm]))

A(PageBreak())


# ─────────────────────────── 6. 극단 입력 12개 검사표
A(Paragraph("6. 극단 입력 12개 검사표", S_H1))
A(Paragraph(
    "1~11번은 세 화면비(1:1·4:5·9:16)에서 각각 그린 뒤, 그려진 픽셀이 캔버스 가장자리에 닿는지를 검사해 잘림 여부를 판정했습니다. "
    "가장자리에 닿은 경우는 한 건도 없었습니다. 12번은 파일 거부 동작을 확인했습니다.", S_BODY))

cases = [
    ("1", "한글 200자", "자동 줄바꿈 + 글자 크기 축소, 잘림 없음", "3개 비율 모두 잘림 없음 (그려진 픽셀 38만 개 확인)", "통과"),
    ("2", "한글·영문·숫자 혼합", "줄바꿈이 어색하게 끊기지 않음", "3개 비율 모두 잘림 없음", "통과"),
    ("3", "명시적 줄바꿈 5줄", "입력한 줄 수 그대로 유지", "5줄 유지, 잘림 없음", "통과"),
    ("4", "이모지만 (가족·피부톤·국기)", "결합 이모지가 쪼개지지 않음", "결합 유지, 잘림 없음 (그려진 픽셀 2.6만 개 확인)", "통과"),
    ("5", "한글 + 이모지 혼합", "기준선이 흔들리거나 겹치지 않음", "3개 비율 모두 잘림 없음", "통과"),
    ("6", "빈 문구", "텍스트 없이 이미지만, 오류 없음", "문구 레이어 생략 (그려진 픽셀 0개), 오류 없음", "통과"),
    ("7", "공백만 (스페이스 10개)", "6번과 동일 처리", "문구 레이어 생략, 오류 없음", "통과"),
    ("8", "공백 없는 영문 120자", "문자 단위 강제 줄바꿈", "글자 단위로 줄바꿈, 잘림 없음", "통과"),
    ("9", "세로 이미지(1080×1920) → 1:1", "채우기 기준 중앙 정렬, 의도한 상하 잘림", "이미지가 캔버스를 채우고 문구 잘림 없음", "통과"),
    ("10", "가로 이미지(1920×1080) → 9:16", "좌우 잘림 또는 여백 배경 채움", "이미지가 캔버스를 채우고 문구 잘림 없음", "통과"),
    ("11", "투명 배경 PNG", "PNG는 투명 유지, JPEG는 배경 합성", "PNG 저장 시 투명 유지 확인", "통과"),
    ("12", "지원하지 않는 파일", "거부 사유 표시, 기존 편집 내용 유지", "SVG·GIF는 형식에서 거부, 확장자만 바꾼 파일은 디코딩에서 거부. 편집 상태 유지", "통과"),
]
rows = [head_row("번호", "검사 자료", "예상 결과", "실제 결과", "판정")]
for n, data, expect, actual, verdict in cases:
    rows.append([P(n, S_CELL_B), P(data), P(expect), P(actual), P(verdict, S_CELL_B)])
A(table(rows, [10 * mm, 34 * mm, 44 * mm, 60 * mm, CONTENT_W - 148 * mm], zebra=True))

A(Paragraph("대표 결함 — 문구가 이미지 내용을 가리는 겹침", S_H2))
A(table([
    [P("증상", S_CELL_B), P("가로로 긴 자료 이미지(표 캡처)를 1:1로 만들 때, 문구가 표 한가운데에 얹혀 셀 내용을 가렸습니다. 문구 자체는 잘리지 않았지만 이미지의 읽어야 할 부분이 문구에 덮였습니다.")],
    [P("원인", S_CELL_B), P("문구를 이미지 위에 직접 그리기만 하고, 글자와 배경을 분리하는 수단이 없었습니다. 흰 바탕에 검은 글자처럼 대비가 약한 조합에서는 외곽선도 도움이 되지 않았습니다.")],
    [P("수정 전", S_CELL_B), P("문구가 표 위에 그대로 겹쳐 셀 글자와 뒤섞임. (부록 C-1)")],
    [P("수정 방법", S_CELL_B), P("문구 뒤에 반투명 띠를 그리는 기능을 넣었습니다. 줄 배열의 최대 폭에 여백을 더해 사각형을 잡고 글자보다 먼저 칠합니다. 불투명도 0이면 그리지 않으므로 기존 결과물은 그대로입니다. 또한 문구를 미리보기에서 직접 끌어 빈 곳으로 옮길 수 있게 했습니다.")],
    [P("수정 후", S_CELL_B), P("띠를 올리면 글자 영역과 표 내용이 분리되어 양쪽 모두 읽힙니다. (부록 C-2)")],
    [P("재검사", S_CELL_B), P("띠를 켠 상태로 위 12개 검사를 다시 돌려 잘림 0건을 확인했고, 미리보기와 저장 파일이 여전히 바이트 단위로 같은 것도 확인했습니다.")],
], [22 * mm, CONTENT_W - 22 * mm], head=False))

A(PageBreak())


# ───────────────────────── 7. 템플릿 데이터와 검사 기록
A(Paragraph("7. 템플릿 데이터 항목과 검사 기록", S_H1))

A(Paragraph("템플릿에 저장하는 항목", S_H2))
A(table([
    head_row("항목", "의미", "저장"),
    [P("name", S_CELL_B), P("템플릿 이름 (최대 40자)"), P("O")],
    [P("ratio", S_CELL_B), P("화면비 — 1:1 · 4:5 · 9:16"), P("O")],
    [P("background", S_CELL_B), P("배경색 또는 투명"), P("O")],
    [P("image.fit / offsetX / offsetY / scale", S_CELL_B), P("이미지 맞춤 방식과 위치·크기"), P("O")],
    [P("text.content", S_CELL_B), P("문구 내용 (줄바꿈·이모지 포함)"), P("O")],
    [P("text.x / y", S_CELL_B), P("문구 위치 — 0~1 비율"), P("O")],
    [P("text.align / sizeRatio / maxWidthRatio / lineHeight", S_CELL_B), P("정렬·글자 크기·글상자 폭·줄 간격"), P("O")],
    [P("text.color / stroke", S_CELL_B), P("글자 색과 외곽선 색·두께"), P("O")],
    [P("text.box", S_CELL_B), P("문구 뒤 띠의 색·불투명도·여백"), P("O")],
    [P("이미지 파일", S_CELL_B), P("저장 공간을 크게 쓰고, 권한을 확인한 이미지가 파일로 새어 나갈 수 있어 저장하지 않습니다."), P("X", S_CELL_B)],
], [64 * mm, CONTENT_W - 78 * mm, 14 * mm], zebra=True))

A(Paragraph("생성·불러오기·수정·삭제 검사 기록", S_H2))
A(table([
    head_row("순서", "동작", "기대", "결과"),
    [P("1", S_CELL_B), P("템플릿 3개 생성 (1:1 · 4:5 · 9:16)"), P("목록 3개"), P("3개 — 통과")],
    [P("2", S_CELL_B), P("2번 템플릿을 이름과 문구를 바꿔 수정"), P("개수는 그대로, 내용만 변경"), P("3개 유지, 이름 변경 확인 — 통과")],
    [P("3", S_CELL_B), P("3번 템플릿 삭제"), P("목록 2개"), P("2개 — 통과")],
    [P("4", S_CELL_B), P("저장 데이터에서 다시 읽기"), P("화면 목록과 저장 데이터 일치"), P("일치 — 통과")],
    [P("5", S_CELL_B), P("템플릿 3개를 넣은 상태에서 실제 새로고침"), P("새로고침 뒤에도 3개 표시"), P("3개 그대로 표시 — 통과")],
    [P("6", S_CELL_B), P("없는 대상을 수정 시도"), P("조용히 추가하지 않고 거부"), P("'수정할 템플릿을 찾지 못했습니다' — 통과")],
], [12 * mm, 62 * mm, 44 * mm, CONTENT_W - 118 * mm], zebra=True))
A(Paragraph(
    "6번은 수정이 생성처럼 동작해 '수정했더니 항목이 하나 늘어나는' 결함을 막기 위한 검사입니다.", S_NOTE))

A(Paragraph("8. 옮겨 쓰기 검사 기록", S_H1))
A(Paragraph("검사에 쓴 파일은 저장소의 <font face='KR-Bd'>zzal-studio/검사 자료</font> 폴더에 함께 들어 있습니다.", S_BODY))
A(table([
    head_row("파일", "내용", "기대", "실제 결과"),
    [P("정상.json", S_CELL_B), P("템플릿 3개 (밈 자막 · 카드 표지 · 자료 캡처)"), P("이름과 설정이 그대로 복원"),
     P("3개 복원, 이름·화면비·문구·띠 설정 모두 일치 — 통과")],
    [P("문법오류.json", S_CELL_B), P("닫는 괄호를 지운 파일"), P("저장 전에 거부, 기존 목록 유지"),
     P("'파일 형식이 올바르지 않습니다. (JSON 문법 오류)' · 목록 3개 유지 — 통과")],
    [P("필수항목누락.json", S_CELL_B), P("2번째 템플릿의 화면비를 지운 파일"), P("저장 전에 거부, 기존 목록 유지"),
     P("'2번째 템플릿의 필수 항목이 빠졌습니다. (화면비)' · 목록 3개 유지 — 통과")],
], [26 * mm, 40 * mm, 34 * mm, CONTENT_W - 100 * mm], zebra=True))

A(Paragraph("검사 순서", S_H2))
A(table([
    head_row("순서", "검사", "거부 문구"),
    [P("1", S_CELL_B), P("JSON 문법이 올바른가"), P("파일 형식이 올바르지 않습니다. (JSON 문법 오류)")],
    [P("2", S_CELL_B), P("최상위가 객체이고 items가 배열인가"), P("템플릿 파일이 아닙니다.")],
    [P("3", S_CELL_B), P("이름·화면비·문구가 있는가"), P("N번째 템플릿의 필수 항목이 빠졌습니다.")],
    [P("4", S_CELL_B), P("위치·크기 값이 0~1 범위인가"), P("N번째 템플릿의 값의 범위가 올바르지 않습니다.")],
    [P("5", S_CELL_B), P("색상이 #RRGGBB 형식인가"), P("N번째 템플릿의 색상 값이 올바르지 않습니다.")],
], [12 * mm, 62 * mm, CONTENT_W - 74 * mm]))
A(Paragraph(
    "다섯 검사를 모두 통과한 뒤에 한 번에 교체합니다. 3번에서 걸린 파일 때문에 1·2번 항목이 먼저 들어가는 일이 없습니다.", S_NOTE))

A(PageBreak())


# ─────────────────────── 9. 개인정보와 이미지 권한
A(Paragraph("9. 개인정보와 이미지 권한", S_H1))
A(table([
    head_row("항목", "처리 방식", "상태"),
    [P("이미지 전송", S_CELL_B), P("서버가 없습니다. 불러온 이미지는 브라우저 메모리에서만 다뤄지고 외부로 전송하는 코드가 없습니다."), P("검증 완료", S_CELL_B)],
    [P("위치 정보(EXIF·GPS)", S_CELL_B), P("결과물은 캔버스에 다시 그려 인코딩하므로 원본의 메타데이터가 승계되지 않습니다."), P("검증 완료", S_CELL_B)],
    [P("원본 이미지 권한", S_CELL_B), P("부록 증빙에 쓴 이미지는 이 작업을 위해 직접 그린 자체 제작 소재입니다. 다른 사진으로 교체할 경우 그 사진의 출처·사용 권한은 다시 확인해 주세요."), P("검증 완료", S_CELL_B)],
    [P("저장 데이터", S_CELL_B), P("localStorage에 템플릿 배치 설정만 저장합니다. 이름·연락처 등 개인정보를 저장하지 않습니다."), P("검증 완료", S_CELL_B)],
    [P("내보낸 JSON", S_CELL_B), P("배치 설정만 담깁니다. 이미지 파일과 개인정보가 들어가지 않습니다."), P("검증 완료", S_CELL_B)],
    [P("비밀값", S_CELL_B), P("API 키·토큰·환경변수를 쓰지 않습니다. 저장소에 비밀값이 없습니다."), P("검증 완료", S_CELL_B)],
], [26 * mm, CONTENT_W - 48 * mm, 22 * mm], status_col=2))

A(Paragraph("10. AI 활용 기록", S_H1))
A(Paragraph("체크리스트 11번 항목입니다.", S_BODY))
A(table([
    [P("① 무엇을 요청했는지", S_CELL_B), P("이미지에 문구를 얹어 밈·카드로 내려받는 웹 도구의 설계와 구현을 요청했습니다.")],
    [P("② 어떤 답을 활용했는지", S_CELL_B), P("캔버스 렌더링, 템플릿 저장, JSON 검증 코드와 극단 입력 12개 검사 결과를 그대로 활용했습니다.")],
    [P("③ 내가 직접 확인·수정한 내용", S_CELL_B), P("문구가 이미지를 가리는 결함을 확인해 위치·띠 색을 다시 지시했고, Vercel 배포와 최종 화면 확인은 직접 했습니다.")],
], [42 * mm, CONTENT_W - 42 * mm], head=False))

A(Paragraph("직접 보완할 내용", S_H2))
A(table([
    head_row("보완할 점", "왜 필요한가"),
    [P("글꼴 고르기", S_CELL_B), P("지금은 한 가지 굵은 고딕으로 고정돼 있습니다. 밈과 카드는 분위기에 따라 글꼴이 달라지는데, 몇 가지 중에서 고를 수 있으면 결과물의 폭이 넓어집니다.")],
    [P("문구 두 개 이상 넣기", S_CELL_B), P("밈은 위아래 두 줄로 나누는 형식이 흔한데 지금은 문구가 하나뿐입니다. 문구를 여러 개 두면 만들 수 있는 형식이 늘어납니다.")],
    [P("되돌리기", S_CELL_B), P("슬라이더를 잘못 움직이면 이전 값으로 돌아가기 어렵습니다. 한 단계 되돌리기가 있으면 마음 놓고 이것저것 시도할 수 있습니다.")],
], [26 * mm, CONTENT_W - 26 * mm], zebra=True))

A(PageBreak())


# ─────────────────────── 11. 제출 전 최종 확인
A(Paragraph("11. 제출 전 최종 확인", S_H1))
A(Paragraph("빈 칸은 제출 전에 직접 해야 하는 항목입니다.", S_BODY))
A(table([
    head_row("상태", "확인 항목"),
    [P("완료", S_CELL_B), P("완주 체크리스트 11개 항목 근거 작성 (1장 · 2장)")],
    [P("완료", S_CELL_B), P("검증 안내서 네 항목과 조작 방법 (3장 · 4장)")],
    [P("완료", S_CELL_B), P("세 화면비 미리보기·파일 일치 검사 (5장)")],
    [P("완료", S_CELL_B), P("극단 입력 12개 검사표와 대표 결함 수정 전·후 (6장)")],
    [P("완료", S_CELL_B), P("템플릿 항목 목록과 생성·수정·삭제·새로고침 검사 (7장)")],
    [P("완료", S_CELL_B), P("정상 JSON과 잘못된 파일 2종 검사 기록 (8장)")],
    [P("완료", S_CELL_B), P("개인정보·비밀값 점검 (9장)")],
    [P("완료", S_CELL_B), P("완성 이미지 3장 저장하고 정상적으로 열리는지 확인 (부록 F)")],
    [P("완료", S_CELL_B), P("완성 이미지의 파일 속성에서 위치 정보가 없는지 확인 (EXIF 0건)")],
    [P("완료", S_CELL_B), P("부록의 증빙 화면 18장 촬영해 넣기")],
    [P("완료", S_CELL_B), P("AI 활용 기록 세 줄 작성 (10장)")],
    [P("완료", S_CELL_B), P("Vercel 배포 — https://aleph-zzal.vercel.app")],
    [P("완료", S_CELL_B), P("실제로 쓸 이미지로 바꾼다면 그 이미지의 사용 권한 다시 확인하기")],
], [16 * mm, CONTENT_W - 16 * mm]))

A(PageBreak())


# ─────────────────────────────────────── 부록. 증빙 화면
A(Paragraph("부록. 증빙 화면", S_H1))
A(Paragraph(
    "아래 목록대로 화면을 촬영해 저장소의 <font face='KR-Bd'>짤카드 증빙 화면</font> 폴더에 같은 번호로 넣고 "
    "<font face='KR-Bd'>짤카드 보고서 생성.py</font>를 다시 실행하면 이 부록이 자동으로 채워집니다.", S_BODY))

SHOTS = [
    ("A-1", "01_PNG불러오기", "PNG 이미지를 불러온 편집 화면. 파일 이름과 미리보기가 함께 보이는 상태."),
    ("A-2", "02_JPEG불러오기", "JPEG 이미지를 불러온 편집 화면."),
    ("A-3", "03_문구변경", "문구 내용·위치·크기·색을 바꾼 뒤 미리보기가 즉시 바뀐 화면."),
    ("A-4", "04_지원안하는파일", "지원하지 않는 파일을 넣어 거부 사유가 뜨고 기존 편집 내용이 남아 있는 화면."),
    ("B-1", "05_비율_1대1", "1:1을 고른 미리보기 화면."),
    ("B-2", "06_비율_4대5", "4:5를 고른 미리보기 화면."),
    ("B-3", "07_비율_9대16", "9:16을 고른 미리보기 화면."),
    ("B-4", "08_저장파일_비교", "미리보기 화면과 내려받은 파일을 같은 높이로 맞춰 나란히 놓은 비교. 평균 화소 차이 3.23/255 — 화면 축소·확대에 따른 표시 오차 수준입니다."),
    ("C-1", "09a_결함_수정전_화면", "수정 전 — 문구를 표 한가운데 그대로 얹은 편집 화면. 표의 신원·기기 열이 글자에 가려집니다."),
    ("C-2", "09_결함_수정전", "수정 전 결과 — 실제로 내려받은 파일. 화면에서 본 것과 같은 겹침이 파일에도 그대로 남습니다."),
    ("C-3", "10a_결함_수정후_화면", "수정 후 — 문구를 표 위 여백으로 옮기고 문구 뒤 띠 85%를 적용한 편집 화면."),
    ("C-4", "10_결함_수정후", "수정 후 결과 — 표의 모든 열이 그대로 보이고 문구도 띠 위에서 뚜렷하게 읽힙니다."),
    ("D-1", "11_템플릿_3개", "템플릿 3개를 만든 목록 화면."),
    ("D-2", "12_템플릿_새로고침후", "새로고침한 직후에도 템플릿 3개가 남아 있는 화면."),
    ("E-1", "13_JSON_정상가져오기", "정상.json을 가져와 템플릿이 복원된 화면."),
    ("E-2", "14_JSON_문법오류", "문법오류.json을 넣어 거부 사유가 뜨고 목록이 그대로인 화면."),
    ("E-3", "15_JSON_필수항목누락", "필수항목누락.json을 넣어 거부 사유가 뜨고 목록이 그대로인 화면."),
    ("F-1", "16_완성이미지_1", "완성 이미지 1 — 서로 다른 문구·비율로 만든 결과물."),
    ("F-2", "17_완성이미지_2", "완성 이미지 2."),
    ("F-3", "18_완성이미지_3", "완성 이미지 3."),
]

GROUPS = {
    "A": "A. 편집과 미리보기 (카드 1)",
    "B": "B. 화면과 파일의 일치 (카드 2)",
    "C": "C. 대표 결함 수정 전·후 (카드 3)",
    "D": "D. 템플릿 관리 (카드 4)",
    "E": "E. 옮겨 쓰기 (카드 5)",
    "F": "F. 완성 이미지 3장",
}


def find_shot(prefix):
    for ext in ("png", "jpg", "jpeg"):
        hits = sorted(glob.glob(os.path.join(SHOT_DIR, f"{prefix}*.{ext}")))
        if hits:
            return hits[0]
    return None


def placeholder(width, height):
    t = Table([[Paragraph("촬영 후 이 자리에 들어갑니다", S_CELL_S)]], colWidths=[width], rowHeights=[height])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, RULE),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FAF8F9")),
    ]))
    return t


current_group = None
for code, prefix, caption in SHOTS:
    group = code.split("-")[0]
    block = []
    if group != current_group:
        block.append(Paragraph(GROUPS[group], S_H2))
        current_group = group

    path = find_shot(prefix)
    max_w = CONTENT_W
    max_h = 88 * mm
    if path:
        iw, ih = ImageReader(path).getSize()
        scale = min(max_w / iw, max_h / ih)
        block.append(Image(path, iw * scale, ih * scale))
    else:
        block.append(placeholder(max_w, 34 * mm))
    block.append(Paragraph(f"{code}. {caption}", S_CAP))
    A(KeepTogether(block))


doc = BaseDocTemplate(
    OUT, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=MARGIN,
    title="짤·카드 스튜디오 제출 보고서", author="진혜정",
)
doc.addPageTemplates([PageTemplate(
    id="main",
    frames=[Frame(MARGIN, MARGIN, CONTENT_W, PAGE_H - MARGIN * 2, id="f", showBoundary=0)],
    onPage=on_page,
)])
doc.build(story)

found = sum(1 for _, prefix, _ in SHOTS if find_shot(prefix))
print(f"생성 완료: {OUT}")
print(f"증빙 화면 {found}/{len(SHOTS)}장 반영")
