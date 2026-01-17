/**
 * Multi-Agent Chat Screen
 * Allows users to interact with specialized AI agents
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { AgentSelector } from '../components/AgentSelector';
import { useOnDemandAgent } from '../hooks/useOnDemandAgent';
import { AgentType } from '../services/OnDemandAgentService';

export const AgentChatScreen: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [showAgentSelector, setShowAgentSelector] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  const { sendMessage, response, isLoading, error, history, clearHistory } =
    useOnDemandAgent(selectedAgent || 'workout-form-coach');

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [history, response]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent) return;

    const message = inputMessage.trim();
    setInputMessage('');
    await sendMessage(message);
  };

  const handleAgentSelect = (agent: AgentType) => {
    setSelectedAgent(agent);
    setShowAgentSelector(false);
  };

  const handleChangeAgent = () => {
    setShowAgentSelector(true);
    clearHistory();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedAgent ? 'AI Assistant' : 'Select AI Assistant'}
        </Text>
        {selectedAgent && (
          <TouchableOpacity onPress={handleChangeAgent} style={styles.changeButton}>
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Agent Selector or Chat */}
      {showAgentSelector ? (
        <ScrollView style={styles.content}>
          <AgentSelector
            selectedAgent={selectedAgent}
            onSelectAgent={handleAgentSelect}
            compact={false}
          />
        </ScrollView>
      ) : (
        <>
          {/* Quick Agent Switcher */}
          <View style={styles.quickSelector}>
            <AgentSelector
              selectedAgent={selectedAgent}
              onSelectAgent={(agent) => {
                setSelectedAgent(agent);
                clearHistory();
              }}
              compact={true}
            />
          </View>

          {/* Chat Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>
                  Start a conversation
                </Text>
                <Text style={styles.emptyStateText}>
                  Ask me anything about {selectedAgent?.replace(/-/g, ' ')}
                </Text>
              </View>
            ) : (
              history.map((msg, index) => (
                <View
                  key={`${msg.timestamp.getTime()}-${index}`}
                  style={[
                    styles.messageBubble,
                    msg.role === 'user'
                      ? styles.userMessage
                      : styles.assistantMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.role === 'user' && styles.userMessageText,
                    ]}
                  >
                    {msg.content}
                  </Text>
                  <Text style={styles.timestamp}>
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              ))
            )}

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>❌ {error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder="Type your message..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputMessage.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  changeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  quickSelector: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 15,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userMessageText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#ffe0e0',
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
    color: '#1a1a1a',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
