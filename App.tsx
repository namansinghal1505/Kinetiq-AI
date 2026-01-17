import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { AppNavigator } from './src/navigation';
import { ThemeProvider } from './src/theme';
import { NotificationService } from './src/services';
import { initializeOnDemandChatbot } from './src/services/OnDemandChatbotService';
import { initializeOnDemandAgents } from './src/services/OnDemandAgentService';
import { useAuthStore } from './src/stores';

// Ignore the Expo Go notification warning (SDK 53+ limitation)
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'expo-notifications:',
]);

// TODO: Add your OnDemand API key here
// Get it from: https://app.on-demand.io/ -> API Keys Management
const ONDEMAND_API_KEY: string = 'RiIxEUt8VYKRO831OXeRg6s7uKDeXJhw';

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);

  // Initialize services on app start
  useEffect(() => {
    // Initialize auth store FIRST (critical for app rendering)
    initializeAuth();

    // Initialize OnDemand Services if API key is available
    if (ONDEMAND_API_KEY && ONDEMAND_API_KEY !== 'YOUR_API_KEY_HERE') {
      try {
        // Initialize basic chatbot
        initializeOnDemandChatbot(ONDEMAND_API_KEY);
        console.log('✅ OnDemand Chatbot initialized');
        
        // Initialize multi-agent system
        initializeOnDemandAgents(ONDEMAND_API_KEY);
        console.log('✅ OnDemand 6-Agent System initialized');
      } catch (error) {
        console.error('Failed to initialize OnDemand services:', error);
      }
    } else {
      console.warn('OnDemand API key not configured. AI features will be limited.');
    }

    // Initialize notification service
    const timer = setTimeout(() => {
      NotificationService.initialize();
    }, 1000);
    
    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      NotificationService.stopUsageTracking();
    };
  }, [initializeAuth]);

  // Skip TensorFlow pre-initialization - let LiveWorkoutScreen load it only when needed
  // This optimization saves ~15 seconds startup time when backend is available
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}