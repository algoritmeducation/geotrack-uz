import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';

// Keep this in sync with your Render deployment URL
const BACKEND_URL = 'https://geotrack-uz.onrender.com';
const LOCATION_TASK_NAME = 'background-location-task';

export default function TrackerScreen() {
  const [workerId, setWorkerId] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('');

  useEffect(() => {
    // 1. Connect WebSocket
    const s = io(BACKEND_URL, { transports: ['websocket', 'polling'] });
    setSocket(s);

    s.on('connect', () => setSocketConnected(true));
    s.on('disconnect', () => setSocketConnected(false));

    // 2. Load saved worker ID
    AsyncStorage.getItem('workerId').then(id => {
      if (id) setWorkerId(id);
    });

    // 3. Check if currently tracking
    Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).then(started => {
      setIsTracking(started);
    });

    // 4. Poll lastSyncTime
    const interval = setInterval(() => {
      AsyncStorage.getItem('lastSyncTime').then(t => {
        if (t) setLastSyncTime(t);
      });
    }, 2000);

    return () => { s.disconnect(); clearInterval(interval); };
  }, []);

  const toggleTracking = async () => {
    if (!workerId) {
      Alert.alert('Error', 'Please enter your Worker ID first.');
      return;
    }

    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      setIsTracking(false);
    } else {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert('Permission denied', 'Foreground location permission is required.');
        return;
      }
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert('Permission denied', 'Background location permission is required for the app to track while closed.');
        return;
      }

      await AsyncStorage.setItem('workerId', workerId);
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 5,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'GeoTrack UZ is active',
          notificationBody: 'Your location is being sent to the dispatcher.',
          notificationColor: '#1d4ed8',
        },
      });
      setIsTracking(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>GeoTrack UZ Worker App</Text>

      <Text style={styles.label}>Worker ID (e.g. w1, w2)</Text>
      <TextInput
        style={styles.input}
        value={workerId}
        onChangeText={setWorkerId}
        placeholder="e.g. w1"
        editable={!isTracking}
      />

      <TouchableOpacity
        style={[styles.button, isTracking ? styles.buttonStop : styles.buttonStart]}
        onPress={toggleTracking}
      >
        <Text style={styles.buttonText}>
          {isTracking ? 'STOP TRACKING' : 'START TRACKING'}
        </Text>
      </TouchableOpacity>

      {isTracking && (
        <View style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: '#059669', textAlign: 'center', fontWeight: '500' }}>
            ✅ Background GPS active. Locations are being synced.
          </Text>
          {lastSyncTime ? (
            <Text style={{ color: '#475569', textAlign: 'center', fontSize: 13, marginTop: 4 }}>
              Last sync: {lastSyncTime}
            </Text>
          ) : null}
        </View>
      )}
      <Text style={[styles.statusText, { marginTop: 12, color: socketConnected ? '#059669' : '#ef4444' }]}>
        {socketConnected ? '🟢 Connected to Server' : '🔴 Server Disconnected (Reconnecting…)'}
      </Text>
    </SafeAreaView>
  );
}

// ── Background Task Definition ────────────────────────────────────
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    const workerId = await AsyncStorage.getItem('workerId');
    if (!workerId || !locations || locations.length === 0) return;

    let queue: any[] = [];
    try {
      const q = await AsyncStorage.getItem('offlineQueue');
      if (q) queue = JSON.parse(q);
    } catch (e) { }

    locations.forEach((loc: any) => {
      queue.push({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        speed: (loc.coords.speed && loc.coords.speed > 0) ? loc.coords.speed * 3.6 : 0,
        ts: loc.timestamp
      });
    });

    let i = 0;
    while (i < queue.length) {
      const loc = queue[i];
      try {
        const res = await fetch(`${BACKEND_URL}/api/locations/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workerId: workerId,
            lat: loc.lat,
            lng: loc.lng,
            speed: loc.speed
          })
        });
        if (res.ok) {
          i++;
        } else {
          break;
        }
      } catch (e: any) {
        console.log('Push failed:', e.message);
        break;
      }
    }

    queue = queue.slice(i);
    await AsyncStorage.setItem('offlineQueue', JSON.stringify(queue));

    if (i > 0) {
      await AsyncStorage.setItem('lastSyncTime', new Date().toLocaleTimeString());
    }
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#f8fafc', padding: 24, justifyContent: 'center'
  },
  title: {
    fontSize: 24, fontWeight: '700', color: '#0f172a', marginBottom: 32, textAlign: 'center'
  },
  label: {
    fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8
  },
  input: {
    borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff',
    borderRadius: 8, padding: 16, fontSize: 16, marginBottom: 24
  },
  button: {
    padding: 18, borderRadius: 8, alignItems: 'center'
  },
  buttonStart: { backgroundColor: '#1d4ed8' },
  buttonStop: { backgroundColor: '#ef4444' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statusText: {
    marginTop: 24, color: '#059669', textAlign: 'center', fontWeight: '500'
  }
});
