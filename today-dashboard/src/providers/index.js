import { provider as weatherOpenMeteo } from "./weatherOpenMeteo";

/**
 * 지금 이 정보판이 쓰는 공급자.
 * 다른 자료로 바꾸려면 같은 모양(key·label·buildSourceUrl·normalize)의 파일을 하나 더 만들어
 * 이 줄만 교체하면 됩니다. 화면·저장·비교 코드는 손대지 않습니다.
 */
export const provider = weatherOpenMeteo;
