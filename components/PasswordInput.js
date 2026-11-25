'use client';
import { useState } from 'react';
import Icon from './Icon';

export default function PasswordInput(props) {
  const [show, setShow] = useState(false);
  const label = show ? 'Hide password' : 'Show password';
  return (
    <div className="pw">
      <input {...props} type={show ? 'text' : 'password'} />
      <button type="button" className="pw-eye" onClick={() => setShow(!show)} aria-label={label} title={label}>
        <Icon n={show ? 'eyeOff' : 'eye'} size="sm" />
      </button>
    </div>
  );
}
