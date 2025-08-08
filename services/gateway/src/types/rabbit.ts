export interface serverUpdateMessage {
  VideoId: string;
  Phase: string;
}

export interface censorUpdateMessage extends serverUpdateMessage {
  Censor: boolean;
}

export interface captionsUpdateMessage extends serverUpdateMessage {
  SRTKey: string;
}

export interface transcoderUpdateMessage extends serverUpdateMessage {
  ManifestKey: string;
}

export interface packagingUpdateMessage extends serverUpdateMessage {
  ManifestKey: string;
  DashKey: string;
}
