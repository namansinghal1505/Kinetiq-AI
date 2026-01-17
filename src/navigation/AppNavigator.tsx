import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useAuthStore } from '../stores';
import {
  HomeScreen,
  ChatScreen,
  ProfileScreen,
  EditProfileScreen,
  ExerciseSelectionScreen,
  LiveWorkoutScreen,
  SessionSummaryScreen,
  HistoryScreen,
  ChatbotCoachScreen,
  AgentChatScreen,
  FindPhysioScreen,
  MyProgramScreen,
  PhysioDashboardScreen,
  PatientDetailScreen,
  AssignProgramScreen,
} from '../screens';
import {
  SignInScreen,
  RoleSelectionScreen,
  ProfileSetupScreen,
} from '../screens/auth';

export type RootStackParamList = {
  // Auth Stack
  SignIn: undefined;
  RoleSelection: { email: string; password: string };
  ProfileSetup: undefined;
  
  // Main Stack
  MainTabs: undefined;
  ExerciseSelection: undefined;
  LiveWorkout: { exercise: string; duration: number };
  SessionSummary: { session: any };
  History: undefined;
  ChatbotCoach: { session?: any };
  AgentChat: undefined;
  EditProfile: undefined;
  
  // Patient Screens
  FindPhysio: undefined;
  MyProgram: undefined;
  
  // Physiotherapist Screens
  PhysioDashboard: undefined;
  PatientDetail: { patientId: string };
  AssignProgram: { patientId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Chat: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const MainTabs = () => {
  const { colors } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { colors, isDarkMode } = useTheme();
  const { user, profile, initialized } = useAuthStore();
  
  const customTheme = {
    ...(isDarkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.primary,
    },
  };

  // Show loading screen while initializing auth
  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Determine if user is fully authenticated (has completed profile)
  const isAuthenticated = user && profile && profile.full_name;
  
  return (
    <NavigationContainer theme={customTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack - shown when not authenticated
          <>
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          </>
        ) : (
          // Main Stack - shown when authenticated
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="ExerciseSelection" component={ExerciseSelectionScreen} />
            <Stack.Screen name="LiveWorkout" component={LiveWorkoutScreen} />
            <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="ChatbotCoach" component={ChatbotCoachScreen} />
            <Stack.Screen name="AgentChat" component={AgentChatScreen} options={{ title: 'AI Assistants' }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />

            {/* Patient Screens */}
            <Stack.Screen name="FindPhysio" component={FindPhysioScreen} />
            <Stack.Screen name="MyProgram" component={MyProgramScreen} />
            
            {/* Physiotherapist Screens */}
            <Stack.Screen name="PhysioDashboard" component={PhysioDashboardScreen} />
            <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
            <Stack.Screen name="AssignProgram" component={AssignProgramScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
