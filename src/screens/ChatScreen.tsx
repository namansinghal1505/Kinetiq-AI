import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../theme';
import { getOnDemandChatbot, ChatMessage as OnDemandMessage } from '../services/OnDemandChatbotService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatBubbleProps {
  message: Message;
  colors: ThemeColors;
  styles: any;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, colors, styles }) => (
  <View
    style={[
      styles.messageBubble,
      message.isUser ? styles.userBubble : styles.aiBubble,
    ]}
  >
    {!message.isUser && (
      <View style={styles.aiAvatarContainer}>
        <View style={styles.aiAvatar}>
          <Ionicons name="fitness" size={16} color={colors.white} />
        </View>
      </View>
    )}
    <View
      style={[
        styles.bubbleContent,
        message.isUser ? styles.userBubbleContent : styles.aiBubbleContent,
      ]}
    >
      {message.isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <>
          <Text
            style={[
              styles.messageText,
              message.isUser ? styles.userMessageText : styles.aiMessageText,
            ]}
          >
            {message.text}
          </Text>
          <Text
            style={[
              styles.timestamp,
              message.isUser ? styles.userTimestamp : styles.aiTimestamp,
            ]}
          >
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </>
      )}
    </View>
  </View>
);

const SuggestedPrompt: React.FC<{ text: string; onPress: () => void; styles: any; colors: ThemeColors }> = ({ text, onPress, styles, colors }) => (
  <TouchableOpacity style={styles.suggestedPrompt} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.suggestedPromptText}>{text}</Text>
    <Ionicons name="arrow-forward" size={16} color={colors.primary} />
  </TouchableOpacity>
);

export const ChatScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm KinetiqAI Coach. I'm here to help you with posture corrections, movement guidance, and fitness tips. What would you like to know?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const suggestedPrompts = [
    'How can I improve my posture?',
    'What does my posture analysis show?',
    'Give me exercise modifications',
    'How do I prevent injury during workouts?',
  ];

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const chatbot = getOnDemandChatbot();
      const response = await chatbot.sendMessage(userMessage.text);

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get response from chatbot';
      console.error('Chat Error:', errorMessage);

      let errorText = "I'm experiencing a technical issue. Please try again in a moment.";

      // Check if it's an initialization error
      if (errorMessage.includes('not initialized')) {
        errorText = "The chat service is not properly configured. Please restart the app and ensure your API key is set.";
      } else if (errorMessage.includes('API Error') || errorMessage.includes('Failed to create')) {
        errorText = "Unable to connect to the chat service. Please check your connection and try again.";
      }

      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedPrompt = (text: string) => {
    setInputText(text);
  };

  return (
    // Added 'top' to edges to fix status bar padding
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 
        Adjusted behavior: 'padding' is generally better for iOS. 
        'height' often works better on Android to prevent coverage.
        Increased offset to clear headers.
      */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kinetiq Coach</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} colors={colors} styles={styles} />
          ))}

          {/* Suggested Prompts - show only when few messages */}
          {messages.length <= 2 && (
            <View style={styles.suggestedContainer}>
              <Text style={styles.suggestedTitle}>Try asking:</Text>
              {suggestedPrompts.map((prompt, index) => (
                <SuggestedPrompt
                  key={index}
                  text={prompt}
                  onPress={() => handleSuggestedPrompt(prompt)}
                  styles={styles}
                  colors={colors}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="add-circle-outline" size={24} color={colors.gray400} />
            </TouchableOpacity>
            <TextInput
              placeholder="Type your message..."
              value={inputText}
              onChangeText={setInputText}
              style={styles.textInput}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim() && !isLoading ? styles.sendButtonActive : styles.sendButtonInactive,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() ? colors.white : colors.gray400}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  aiAvatarContainer: {
    marginRight: spacing.sm,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleContent: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  userBubbleContent: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.sm,
  },
  aiBubbleContent: {
    backgroundColor: colors.cardBg, // Use cardBg which changes in dark mode
    borderBottomLeftRadius: borderRadius.sm,
  },
  messageText: {
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
  },
  userMessageText: {
    color: colors.white,
  },
  aiMessageText: {
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  aiTimestamp: {
    color: colors.textMuted,
  },
  suggestedContainer: {
    marginTop: spacing.lg,
    paddingLeft: 40, // Align with AI messages
  },
  suggestedTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: fontWeight.medium,
  },
  suggestedPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestedPromptText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xs,
  },
  attachButton: {
    padding: spacing.sm,
  },
  micButton: {
    padding: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'transparent',
    maxHeight: 100,
    minHeight: 40,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
  },
  sendButtonInactive: {
    backgroundColor: colors.gray200, // Should probably be dynamic in future, but ok for now
  },
});
