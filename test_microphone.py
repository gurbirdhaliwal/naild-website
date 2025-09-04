import sounddevice as sd
import numpy as np
import time

def test_microphone():
    """Test microphone access and audio levels"""
    print("🎤 Testing microphone access...")
    
    # List available devices
    print("\n📋 Available audio devices:")
    devices = sd.query_devices()
    for i, device in enumerate(devices):
        if 'max_inputs' in device and device['max_inputs'] > 0:  # Input devices only
            print(f"  {i}: {device['name']} (inputs: {device['max_inputs']})")
    
    # Get default device
    default_device = sd.query_devices(kind='input')
    print(f"\n🎯 Default input device: {default_device['name']}")
    
    # Test audio capture
    print("\n🎧 Testing audio capture for 5 seconds...")
    print("Speak into your microphone and watch the audio levels:")
    
    def audio_callback(indata, frames, time_info, status):
        if status:
            print(f"Status: {status}")
        # Calculate audio level
        audio_level = np.abs(indata).mean()
        print(f"Audio level: {audio_level:.6f}")
    
    try:
        with sd.InputStream(
            channels=1,
            samplerate=16000,
            dtype=np.float32,
            blocksize=1024,
            callback=audio_callback
        ):
            print("✅ Microphone access successful!")
            print("Listening for 5 seconds...")
            time.sleep(5)
            
    except Exception as e:
        print(f"❌ Microphone access failed: {e}")
        return False
    
    print("✅ Microphone test completed!")
    return True

if __name__ == "__main__":
    test_microphone() 