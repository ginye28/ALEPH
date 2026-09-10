/** 내 자료 전체를 파일 하나로 (T06-C36). */
import { db } from "./client";

export const exportAllData = () => db.exportAll();
