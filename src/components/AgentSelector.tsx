/**
 * Agent Selector Component
 * Allows users to choose which specialized AI agent to interact with
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AgentType } from '../services/OnDemandAgentService';
import { useAvailableAgents } from '../hooks/useOnDemandAgent';

interface AgentSelectorProps {
  selectedAgent: AgentType | null;
  onSelectAgent: (agent: AgentType) => void;
  compact?: boolean;
}

const AGENT_ICONS: Record<AgentType, string> = {
  'workout-form-coach': '🏋️',
  'physiotherapist-assistant': '🩺',
  'injury-prevention-expert': '🛡️',
  'exercise-modification-specialist': '⚙️',
  'progress-analyzer': '📊',
  'motivation-coach': '💪',
};

const AGENT_COLORS: Record<AgentType, string> = {
  'workout-form-coach': '#4CAF50',
  'physiotherapist-assistant': '#2196F3',
  'injury-prevention-expert': '#FF9800',
  'exercise-modification-specialist': '#9C27B0',
  'progress-analyzer': '#00BCD4',
  'motivation-coach': '#E91E63',
};

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  selectedAgent,
  onSelectAgent,
  compact = false,
}) => {
  const agents = useAvailableAgents();

  if (compact) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.compactContainer}
      >
        {agents.map((agent) => (
          <TouchableOpacity
            key={agent.type}
            style={[
              styles.compactCard,
              selectedAgent === agent.type && {
                backgroundColor: AGENT_COLORS[agent.type],
                borderColor: AGENT_COLORS[agent.type],
              },
            ]}
            onPress={() => onSelectAgent(agent.type)}
          >
            <Text style={styles.compactIcon}>{AGENT_ICONS[agent.type]}</Text>
            <Text
              style={[
                styles.compactName,
                selectedAgent === agent.type && styles.compactNameSelected,
              ]}
              numberOfLines={2}
            >
              {agent.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your AI Assistant</Text>
      {agents.map((agent) => (
        <TouchableOpacity
          key={agent.type}
          style={[
            styles.card,
            selectedAgent === agent.type && {
              borderColor: AGENT_COLORS[agent.type],
              borderWidth: 2,
            },
          ]}
          onPress={() => onSelectAgent(agent.type)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.icon}>{AGENT_ICONS[agent.type]}</Text>
            <Text style={styles.name}>{agent.name}</Text>
          </View>
          <View style={styles.capabilitiesContainer}>
            {agent.capabilities.slice(0, 3).map((capability, index) => (
              <View
                key={index}
                style={[
                  styles.capabilityBadge,
                  { backgroundColor: `${AGENT_COLORS[agent.type]}20` },
                ]}
              >
                <Text
                  style={[styles.capabilityText, { color: AGENT_COLORS[agent.type] }]}
                >
                  {capability}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  capabilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  capabilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  capabilityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  compactContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  compactCard: {
    width: 100,
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  compactIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  compactName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  compactNameSelected: {
    color: '#fff',
  },
});
