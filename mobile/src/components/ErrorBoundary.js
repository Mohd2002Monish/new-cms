import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import logger from '../utils/logger';
import storage from '../utils/storage';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showLogs: false,
      logs: [],
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('ErrorBoundary', error?.message || 'Component Crash', {
      error,
      componentStack: errorInfo?.componentStack,
    });
    this.setState({ errorInfo });
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleClearDataAndRestart = async () => {
    try {
      await storage.clear();
      logger.info('ErrorBoundary', 'User initiated full storage reset');
      this.setState({ hasError: false, error: null, errorInfo: null });
    } catch (_) {
      this.setState({ hasError: false });
    }
  };

  handleViewLogs = async () => {
    const logs = await logger.getLogs();
    this.setState({ showLogs: true, logs });
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'Unknown runtime error';
      const stack = this.state.error?.stack || this.state.errorInfo?.componentStack || 'No stack trace available';

      if (this.state.showLogs) {
        return (
          <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Application Diagnostic Logs</Text>
              <TouchableOpacity
                style={styles.closeLogsBtn}
                onPress={() => this.setState({ showLogs: false })}
              >
                <Text style={styles.closeLogsBtnText}>Back</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.logsScroll}>
              {this.state.logs.length === 0 ? (
                <Text style={styles.logLine}>No stored logs found.</Text>
              ) : (
                this.state.logs.map((item, idx) => (
                  <View key={item.id || idx} style={styles.logItem}>
                    <Text
                      style={[
                        styles.logLevel,
                        item.level === 'ERROR'
                          ? styles.logError
                          : item.level === 'WARN'
                          ? styles.logWarn
                          : styles.logInfo,
                      ]}
                    >
                      {item.level} • {item.tag}
                    </Text>
                    <Text style={styles.logMessage}>{item.message}</Text>
                    {item.details ? <Text style={styles.logDetails}>{item.details}</Text> : null}
                  </View>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        );
      }

      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>⚠️</Text>
            </View>

            <Text style={styles.title}>Something Went Wrong</Text>
            <Text style={styles.subtitle}>
              The application encountered an unexpected error. You can review the details below or restart the app.
            </Text>

            <View style={styles.errorBox}>
              <Text style={styles.errorLabel}>ERROR DETAILS</Text>
              <Text style={styles.errorMessage}>{errorMsg}</Text>
              <ScrollView style={styles.stackScroll} nestedScrollEnabled>
                <Text style={styles.stackText}>{stack}</Text>
              </ScrollView>
            </View>

            <View style={styles.buttonCol}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={this.handleRestart}
                activeOpacity={0.8}
              >
                <Text style={styles.btnPrimaryText}>Restart Application</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={this.handleViewLogs}
                activeOpacity={0.8}
              >
                <Text style={styles.btnSecondaryText}>View System Logs</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnDanger]}
                onPress={this.handleClearDataAndRestart}
                activeOpacity={0.8}
              >
                <Text style={styles.btnDangerText}>Clear Cache & Reload</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 20,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  errorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 10,
    lineHeight: 18,
  },
  stackScroll: {
    maxHeight: 180,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    padding: 10,
  },
  stackText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  buttonCol: {
    width: '100%',
    gap: 10,
  },
  btn: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: '#334155',
  },
  btnSecondaryText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  btnDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  btnDangerText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  closeLogsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#334155',
    borderRadius: 6,
  },
  closeLogsBtnText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  logsScroll: {
    flex: 1,
    padding: 16,
  },
  logItem: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logLevel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  logInfo: {
    color: '#38bdf8',
  },
  logWarn: {
    color: '#fbbf24',
  },
  logError: {
    color: '#ef4444',
  },
  logMessage: {
    fontSize: 13,
    color: '#f8fafc',
    lineHeight: 18,
  },
  logDetails: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'monospace',
    marginTop: 4,
  },
});

