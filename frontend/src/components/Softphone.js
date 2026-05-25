import { useState, useEffect, useRef } from 'react';
import { UserAgent, Registerer, Inviter, SessionState } from 'sip.js';

const WS_SERVER = `wss://${window.location.hostname}/ws`;
const SIP_DOMAIN = window.location.hostname;
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function Softphone({ extension, sipPassword }) {
  const [status, setStatus] = useState('Disconnected');
  const [callStatus, setCallStatus] = useState('');
  const [dialNumber, setDialNumber] = useState('');
  const [inCall, setInCall] = useState(false);
  const userAgentRef = useRef(null);
  const sessionRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (!extension || !sipPassword) return;

    const uri = UserAgent.makeURI(`sip:${extension}@${SIP_DOMAIN}`);
    const ua = new UserAgent({
      uri,
      transportOptions: {
        server: WS_SERVER,
        traceSip: true,
      },
      authorizationUsername: extension,
      authorizationPassword: sipPassword,
      logBuiltinEnabled: true,
      logLevel: 'warn',
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionConfiguration: ICE_CONFIG,
      },
    });

    ua.delegate = {
      onInvite: (invitation) => {
        setCallStatus(`Incoming call from ${invitation.remoteIdentity.uri.user}`);
        sessionRef.current = invitation;

        invitation.stateChange.addListener((state) => {
          if (state === SessionState.Terminated) {
            setInCall(false);
            setCallStatus('');
            sessionRef.current = null;
          }
        });
      }
    };

    setStatus(`Connecting to ${WS_SERVER}…`);
    ua.start().then(() => {
      setStatus('WS connected, registering…');
      const registerer = new Registerer(ua);
      registerer.register().then(() => {
        setStatus('Registered ✓');
      }).catch(err => setStatus(`Reg failed: ${err?.message || err}`));
    }).catch(err => setStatus(`WS failed: ${err?.message || err}`));

    userAgentRef.current = ua;

    return () => {
      ua.stop();
    };
  }, [extension, sipPassword]);

  const makeCall = () => {
    if (!dialNumber || !userAgentRef.current) return;
    const target = UserAgent.makeURI(`sip:${dialNumber}@${SIP_DOMAIN}`);
    const inviter = new Inviter(userAgentRef.current, target, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
        peerConnectionConfiguration: ICE_CONFIG,
      },
    });

    inviter.stateChange.addListener((state) => {
      if (state === SessionState.Established) {
        setInCall(true);
        setCallStatus(`In call with ${dialNumber}`);
        const remoteStream = new MediaStream();
        inviter.sessionDescriptionHandler.peerConnection.getReceivers().forEach(r => {
          if (r.track) remoteStream.addTrack(r.track);
        });
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play();
        }
      }
      if (state === SessionState.Terminated) {
        setInCall(false);
        setCallStatus('');
        sessionRef.current = null;
      }
    });

    inviter.invite();
    sessionRef.current = inviter;
    setCallStatus(`Calling ${dialNumber}...`);
  };

  const answerCall = () => {
    if (!sessionRef.current) return;
    sessionRef.current.accept({
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
        peerConnectionConfiguration: ICE_CONFIG,
      },
    }).then(() => {
      setInCall(true);
      const remoteStream = new MediaStream();
      sessionRef.current.sessionDescriptionHandler.peerConnection.getReceivers().forEach(r => {
        if (r.track) remoteStream.addTrack(r.track);
      });
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play();
      }
    });
  };

  const hangup = () => {
    if (sessionRef.current) {
      sessionRef.current.bye?.() || sessionRef.current.reject?.();
    }
    setInCall(false);
    setCallStatus('');
  };

  return (
    <div style={s.phone}>
      <audio ref={remoteAudioRef} autoPlay />
      <div style={s.header}>
        <span style={s.ext}>Ext: {extension}</span>
        <span style={{...s.dot, background: status === 'Registered ✓' ? '#38a169' : '#e53e3e'}} />
        <span style={s.status}>{status}</span>
      </div>

      {callStatus && (
        <div style={s.callStatus}>{callStatus}</div>
      )}

      {!inCall && !callStatus && (
        <div style={s.dialpad}>
          <input style={s.input} placeholder="Extension to call"
            value={dialNumber} onChange={e => setDialNumber(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && makeCall()} />
          <button style={s.callBtn} onClick={makeCall}>📞 Call</button>
        </div>
      )}

      {callStatus && callStatus.startsWith('Incoming') && !inCall && (
        <div style={s.actions}>
          <button style={s.answerBtn} onClick={answerCall}>✅ Answer</button>
          <button style={s.hangupBtn} onClick={hangup}>❌ Reject</button>
        </div>
      )}

      {inCall && (
        <button style={s.hangupBtn} onClick={hangup}>📵 Hang Up</button>
      )}
    </div>
  );
}

const s = {
  phone: { background: '#1a1a2e', borderRadius: 12, padding: 20, color: '#fff', width: 280 },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
  ext: { fontWeight: 700, fontSize: 16 },
  dot: { width: 10, height: 10, borderRadius: '50%', marginLeft: 'auto' },
  status: { fontSize: 12, color: '#a0aec0' },
  callStatus: { background: '#2d3748', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14, textAlign: 'center' },
  dialpad: { display: 'flex', gap: 8 },
  input: { flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', background: '#2d3748', color: '#fff', fontSize: 14 },
  callBtn: { padding: '10px 14px', background: '#38a169', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 16 },
  answerBtn: { flex: 1, padding: 12, background: '#38a169', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600 },
  hangupBtn: { width: '100%', padding: 12, background: '#e53e3e', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600, marginTop: 8 },
  actions: { display: 'flex', gap: 8 },
};
