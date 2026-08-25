import * as s from "./styles";

const DOT_LABEL = {
    ok: "정상",
    stale: "주의",
    empty: "실패",
    loading: "진행",
};

function StatusBadge({ tone, title }) {
    return (
        <span css={s.badge(tone)} role="status">
            <span css={s.dot(tone)} aria-hidden="true" />
            <span css={s.text}>{title}</span>
            <span css={s.srOnly}>{DOT_LABEL[tone] ?? ""}</span>
        </span>
    );
}

export default StatusBadge;
