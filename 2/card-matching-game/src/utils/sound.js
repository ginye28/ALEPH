let audioContext = null;

const TONES = {
    flip: [ { freq: 520, duration: 0.06 } ],
    match: [ { freq: 659, duration: 0.08 }, { freq: 880, duration: 0.12 } ],
    miss: [ { freq: 233, duration: 0.14 } ],
    clear: [ { freq: 659, duration: 0.1 }, { freq: 880, duration: 0.1 }, { freq: 1175, duration: 0.22 } ],
    fail: [ { freq: 311, duration: 0.16 }, { freq: 175, duration: 0.3 } ],
};

const getContext = () => {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
        return null;
    }
    if (!audioContext) {
        audioContext = new AudioCtor();
    }
    return audioContext;
}

export const playSound = (name) => {
    const tones = TONES[name];
    if (!tones) {
        return;
    }

    try {
        const context = getContext();
        if (!context) {
            return;
        }
        if (context.state === "suspended") {
            context.resume();
        }

        let startAt = context.currentTime;
        tones.forEach(({ freq, duration }) => {
            const oscillator = context.createOscillator();
            const gain = context.createGain();

            oscillator.type = "triangle";
            oscillator.frequency.setValueAtTime(freq, startAt);
            gain.gain.setValueAtTime(0.0001, startAt);
            gain.gain.exponentialRampToValueAtTime(0.1, startAt + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(startAt);
            oscillator.stop(startAt + duration + 0.02);

            startAt += duration;
        });
    } catch {
        // 오디오를 쓸 수 없는 환경에서도 게임 진행은 그대로 이어집니다.
    }
}
