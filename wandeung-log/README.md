# 완등 로그

클라이밍 완등 기록 웹앱. 주 2~3회 암장을 가는 사람이 난이도별 완등/실패를 남기고
월별 성장 곡선을 본다. 완등 영상은 선택으로 붙이고, 원하면 게시판에 공유한다.

- 배포: https://aleph-climb.vercel.app

## 구조

```
index.html                  앱 전체 (React 18 + Tailwind + Lucide, 전부 CDN)
api/feed.js                 공유 게시판 — GET 목록 / POST 새 글
api/upload.js               영상 업로드 허가 토큰 발급
lib/http.js                 요청·응답 잡일
lib/feed-store.js           Blob 기반 글 저장소
tools/build-artifact.mjs    index.html → 아티팩트용 파일
wandeung-log.artifact.html  위 스크립트가 만든 파일 (직접 고치지 말 것)
```

빌드 도구가 없다. `index.html` 하나가 앱 전부고, 서버는 함수 두 개뿐이다.

## 영상이 저장되는 곳

두 군데이고, 목적이 다르다.

| | 어디에 | 누가 보나 | 언제 |
| --- | --- | --- | --- |
| 내 사본 | 브라우저 IndexedDB | 나만 | 영상을 붙이면 항상 |
| 공유본 | Vercel Blob | 주소를 아는 누구나 | "게시판에 공유"를 켰을 때만 |

내 사본을 먼저 만들고 공유 업로드를 나중에 한다. 업로드가 실패해도 내 기록에는 영상이 남는다.

파일은 서버리스 함수를 거치지 않는다. 함수의 요청 본문 한도가 4.5MB라 영상이 통과하지
못하기 때문에, `api/upload.js`가 짧은 허가 토큰만 발급하고 브라우저가 저장소로 직접 올린다.
저장소 쓰기 토큰(`BLOB_READ_WRITE_TOKEN`)은 서버에만 남는다. 한 개당 50MB까지.

## 같은 앱, 세 곳

| 주소 | 기록·그래프 | 영상 붙이기 | 게시판 공유 |
| --- | --- | --- | --- |
| Vercel | ○ | ○ | ○ |
| GitHub Pages | ○ | ○ (내 브라우저에만) | ✗ |
| claude.ai 아티팩트 | ○ | ○ (내 브라우저에만) | ✗ |

앱이 뜰 때 `api/feed`를 한 번 찔러 보고, 응답이 없으면 로컬 모드로 내려간다.
그래서 서버가 없는 곳에서도 화면이 깨지지 않는다.

## 개발

```bash
npm install
node tools/build-artifact.mjs     # 아티팩트용 파일 다시 만들기
```

## 배포

이 프로젝트는 GitHub 연결이 없다. **푸시해도 배포되지 않는다.** 저장소 루트에서:

```bash
npx vercel link --yes --project aleph-climb
npx vercel --prod --yes
```

Vercel 프로젝트의 Root Directory가 `wandeung-log`로 잡혀 있어서, 저장소 루트에서 돌려야 한다.

## 한계

- 로그인이 없다. 닉네임은 본인이 적는 이름일 뿐 신원이 아니다.
  그래서 글 수정·삭제를 열지 않았다 — 열면 남의 글도 지울 수 있다.
- 게시판 글은 60개까지만 둔다. 넘으면 오래된 것부터 영상과 함께 지워진다.
  글 하나가 파일 하나라 목록을 읽을 때 전부 받아오기 때문이다. 더 늘리려면 Postgres로 옮겨야 한다.
- 영상 업로드에 속도 제한이 없다. 주소가 알려지면 저장소를 채울 수 있다.
