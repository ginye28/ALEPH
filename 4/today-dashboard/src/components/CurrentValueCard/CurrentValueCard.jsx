import StatusBadge from "../StatusBadge/StatusBadge";
import * as c from "../../styles/controls";
import { formatValue } from "../../utils/format";
import { TIMEZONE_LABEL, formatLocalStamp, formatStamp } from "../../utils/timezone";
import * as s from "./styles";

function CurrentValueCard({ snapshot, status, provider, isLoading, onRetry }) {
    return (
        <section css={s.card}>
            <header css={s.head}>
                <div>
                    <p css={s.item}>{snapshot?.itemLabel ?? provider.label}</p>
                    <p css={s.purpose}>{provider.purpose}</p>
                </div>
                <StatusBadge tone={status.tone} title={status.title} />
            </header>

            {status.showsValue && snapshot ? (
                <p css={s.value}>
                    <span css={s.number}>{formatValue(snapshot.value, provider.digits)}</span>
                    <span css={s.unit}>{snapshot.unit}</span>
                </p>
            ) : (
                <p css={s.empty}>
                    아직 정상값이 없습니다
                    <small>값을 지어내지 않고 비워 둡니다.</small>
                </p>
            )}

            {status.detail && <p css={s.detail(status.tone)}>{status.detail}</p>}

            <dl css={s.meta}>
                <div css={s.metaRow}>
                    <dt css={c.label}>출처</dt>
                    <dd>
                        {snapshot ? (
                            <a
                                css={s.link}
                                href={snapshot.sourceUrl}
                                target="_blank"
                                rel="noreferrer">
                                {provider.sourceName}
                                <span css={s.linkHint}>원자료 열기 ↗</span>
                            </a>
                        ) : (
                            <span css={s.pending}>-</span>
                        )}
                    </dd>
                </div>

                <div css={s.metaRow}>
                    <dt css={c.label}>
                        {status.tone === "ok" ? "조회 시각" : "마지막 정상 조회 시각"}
                    </dt>
                    <dd css={c.mono}>
                        {snapshot ? `${formatStamp(snapshot.fetchedAt)} ${TIMEZONE_LABEL}` : "-"}
                    </dd>
                </div>

                <div css={s.metaRow}>
                    <dt css={c.label}>자료 기준 시각</dt>
                    <dd css={c.mono}>
                        {snapshot ? `${formatLocalStamp(snapshot.observedAt)} 기준` : "-"}
                    </dd>
                </div>
            </dl>

            <div css={s.actions}>
                <button type="button" css={c.primaryButton} onClick={onRetry} disabled={isLoading}>
                    {isLoading ? "확인하는 중…" : "다시 확인"}
                </button>
                <span css={c.panelHint}>{provider.sourceNote}</span>
            </div>
        </section>
    );
}

export default CurrentValueCard;
