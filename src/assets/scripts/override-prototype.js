(function () {
  const __speed_changer_play_original_key__ = Symbol(
    '__speed_changer_play_original__',
  );

  function __speed_changer_play_override__() {
    // Add off-screen media elements to the DOM
    // so that their `timeupdate` events are captured
    // by the extension's content script.
    if (!this.isConnected && !document.documentElement.contains(this)) {
      document.body.appendChild(this);

      // Hide video content that was supposed to be off-screen.
      if (this instanceof HTMLVideoElement) {
        this.hidden = true;
      }
    }

    return __speed_changer_play_override__[
      __speed_changer_play_original_key__
    ].call(this, ...arguments);
  }

  __speed_changer_play_override__[__speed_changer_play_original_key__] =
    HTMLMediaElement.prototype.play;

  HTMLMediaElement.prototype.play = __speed_changer_play_override__;
})();
