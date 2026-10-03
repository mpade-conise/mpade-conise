import { Device } from 'mediasoup-client';

export class LiveSFUClient {
  constructor({ socket, streamId, role = 'viewer', onStream, onStatus } = {}) {
    this.socket = socket;
    this.streamId = streamId;
    this.role = role;
    this.onStream = onStream;
    this.onStatus = onStatus;
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.consumers = new Map();
    this.producers = new Set();
    this.closed = false;
    this.handleNewProducer = this.handleNewProducer.bind(this);
    this.handleProducerClosed = this.handleProducerClosed.bind(this);
  }

  emitAck(event, payload) {
    return new Promise((resolve, reject) => {
      this.socket.emit(event, payload, result => {
        if (!result?.ok) reject(new Error(result?.error || ('SFU ' + event + ' failed.')));
        else resolve(result);
      });
    });
  }

  async start(localStream = null) {
    if (!this.socket || !this.streamId) throw new Error('SFU requires a socket and streamId.');
    this.localStream = localStream;
    this.onStatus?.('Connecting to Live SFU...');
    const joined = await this.emitAck('sfu_join', { streamId: this.streamId, role: this.role });
    this.device = new Device();
    await this.device.load({ routerRtpCapabilities: joined.routerRtpCapabilities });
    this.socket.on('sfu_new_producer', this.handleNewProducer);
    this.socket.on('sfu_producer_closed', this.handleProducerClosed);

    if (this.role !== 'viewer' && this.localStream) {
      await this.createSendTransport();
      for (const track of this.localStream.getTracks()) await this.produce(track);
    }

    if (this.role === 'viewer' || joined.producers?.length) {
      await this.createRecvTransport();
      for (const producer of joined.producers || []) await this.consume(producer.producerId);
    }

    if (this.role === 'viewer') this.onStatus?.('Live SFU connected');
    return this;
  }

  async createSendTransport() {
    const data = await this.emitAck('sfu_create_transport', { streamId: this.streamId, direction: 'send' });
    this.sendTransport = this.device.createSendTransport(data);
    this.sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      this.emitAck('sfu_connect_transport', { streamId: this.streamId, direction: 'send', dtlsParameters }).then(callback).catch(errback);
    });
    this.sendTransport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
      this.emitAck('sfu_produce', { streamId: this.streamId, kind, rtpParameters, appData }).then(({ id }) => { this.producers.add(id); callback({ id }); }).catch(errback);
    });
    this.sendTransport.on('connectionstatechange', state => {
      if (state === 'failed' || state === 'closed') this.onStatus?.('SFU publish connection lost');
    });
  }

  async createRecvTransport() {
    if (this.recvTransport) return;
    const data = await this.emitAck('sfu_create_transport', { streamId: this.streamId, direction: 'recv' });
    this.recvTransport = this.device.createRecvTransport(data);
    this.recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      this.emitAck('sfu_connect_transport', { streamId: this.streamId, direction: 'recv', dtlsParameters }).then(callback).catch(errback);
    });
    this.recvTransport.on('connectionstatechange', state => {
      if (state === 'failed' || state === 'closed') this.onStatus?.('SFU receive connection lost');
    });
  }

  async produce(track) {
    if (!this.sendTransport || !track) return null;
    return this.sendTransport.produce({ track, appData: { kind: track.kind } });
  }

  async handleNewProducer({ producerId, peerId }) {
    if (this.closed || peerId === this.socket.id) return;
    try {
      await this.createRecvTransport();
      await this.consume(producerId);
    } catch (error) {
      this.onStatus?.(error.message);
    }
  }

  async consume(producerId) {
    if (this.consumers.has(producerId)) return;
    const data = await this.emitAck('sfu_consume', { streamId: this.streamId, producerId, rtpCapabilities: this.device.rtpCapabilities });
    const consumer = await this.recvTransport.consume({ id: data.id, producerId: data.producerId, kind: data.kind, rtpParameters: data.rtpParameters });
    this.consumers.set(producerId, consumer);
    this.remoteStream.addTrack(consumer.track);
    this.onStream?.(this.remoteStream);
    await this.emitAck('sfu_resume', { streamId: this.streamId, consumerId: consumer.id });
    consumer.on('transportclose', () => this.removeConsumer(producerId));
    consumer.on('producerclose', () => this.removeConsumer(producerId));
    return consumer;
  }

  removeConsumer(producerId) {
    const consumer = this.consumers.get(producerId);
    if (!consumer) return;
    try { this.remoteStream.removeTrack(consumer.track); } catch {}
    try { consumer.close(); } catch {}
    this.consumers.delete(producerId);
    this.onStream?.(this.remoteStream);
  }

  handleProducerClosed({ producerId }) {
    this.removeConsumer(producerId);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.socket.off('sfu_new_producer', this.handleNewProducer);
    this.socket.off('sfu_producer_closed', this.handleProducerClosed);
    this.consumers.forEach(consumer => consumer.close());
    this.consumers.clear();
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.socket.emit('sfu_leave');
    this.remoteStream.getTracks().forEach(track => track.stop());
    this.remoteStream = new MediaStream();
  }
}

export const LIVE_SFU_ENABLED = String(import.meta.env.VITE_LIVE_SFU_ENABLED ?? 'true').toLowerCase() === 'true';
