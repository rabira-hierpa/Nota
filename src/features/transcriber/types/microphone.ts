export interface Microphone {
  id: string;
  label: string;
  /** Loopback/meeting devices (BlackHole, Teams…) carry no voice unless something routes audio into them. */
  virtual: boolean;
  /** The device the OS currently calls the default input. */
  systemDefault: boolean;
}
