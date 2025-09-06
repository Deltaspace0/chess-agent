class StatusNotifier {
  protected statusCallback: (status: string) => void = console.log;

  onUpdateStatus(callback: (status: string) => void) {
    this.statusCallback = callback;
  }
}

export default StatusNotifier;
