---
description: 과제 폴더를 Vercel에 재배포하고 공개 주소에서 검사 스크립트로 재검증
argument-hint: <과제폴더 예: 7/plandosee-auth> <vercel-project-name 예: aleph-pds-auth> <공개주소>
---

`$1`(예: `7/plandosee-auth`)을 `$2`(예: `aleph-pds-auth`) Vercel 프로젝트로 재배포하고, `$3`(예: `https://aleph-pds-auth.vercel.app`)에서 검사 스크립트를 돌려 재검증한다.

이 저장소는 각 과제가 `<번호>/<프로젝트폴더>/` 형태로 들어 있고, Vercel CLI는 전역 설치돼 있지 않아 `npx vercel`로 불러야 한다. 프로젝트 폴더를 옮긴 적이 있다면 Vercel의 Root Directory 설정이 옛 경로를 가리키고 있을 수 있으니 먼저 맞춰야 한다.

순서:

1. **Root Directory 확인/수정** — 저장소 루트에서:
   ```bash
   npx vercel project update $2 --root-directory "$1" --yes
   ```
   이미 맞는 경로면 `"changed": false`로 나오니 그냥 넘어가면 된다.

2. **링크 + 배포** — 반드시 저장소 루트(`C:\gov\ALEPH`)에서 실행한다. 프로젝트 폴더 안에서 실행하면 Root Directory가 이중으로 적용되어 "Root Directory does not exist" 에러가 난다.
   ```bash
   npx vercel link --yes --project $2
   npx vercel --prod --yes
   ```

3. **재검증** — `$1/tools/check.mjs`를 공개 주소로 돌린다. URL 환경변수 이름은 프로젝트마다 다를 수 있으니(`BOARD_URL` 등) 해당 스크립트의 `process.env.*` 부분을 먼저 확인한다.
   ```bash
   cd "$1" && BOARD_URL=$3 node tools/check.mjs
   ```

4. **정리** — 저장소 루트의 `.vercel/`, `.env.local`은 커밋하면 안 되는 CLI 부산물이다. 작업이 끝나면 지운다:
   ```bash
   rm -rf .vercel .env.local
   ```

5. 검사 결과가 이전과 달라진 항목(특히 새로 FAIL 또는 새로 보류가 된 것)이 있으면, 그게 배포 때문인지 아니면 검사 스크립트가 찾는 파일 위치(예: 내보내기 json)가 옮겨져서 그런 것인지 구분해서 알려준다.
