package logger

import (
	"context"
	"fmt"
	"io"
	"os"

	"github.com/sirupsen/logrus"
)

type Logger struct {
	*logrus.Logger
	podName string
}

func NewLogger(serviceName string) *Logger {
	log := logrus.New()

	podName := os.Getenv("HOSTNAME")
	if podName == "" {
		podName = serviceName
	}

	log.SetFormatter(&CustomTextFormatter{
		PodName: podName,
	})

	var output io.Writer = os.Stdout

	if logFile := os.Getenv("LOG_FILE"); logFile != "" {
		if err := os.MkdirAll("/app/logs", 0755); err == nil {
			file, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
			if err == nil {
				output = io.MultiWriter(os.Stdout, file)
			}
		}
	}

	log.SetOutput(output)

	if level := os.Getenv("LOG_LEVEL"); level != "" {
		if parsedLevel, err := logrus.ParseLevel(level); err == nil {
			log.SetLevel(parsedLevel)
		}
	} else {
		log.SetLevel(logrus.InfoLevel)
	}

	return &Logger{
		Logger:  log,
		podName: podName,
	}
}

type CustomTextFormatter struct {
	PodName string
}

func (f *CustomTextFormatter) Format(entry *logrus.Entry) ([]byte, error) {
	timestamp := entry.Time.Format("2006-01-02 15:04:05.000")
	level := entry.Level.String()

	logLine := fmt.Sprintf("%s | %s | %s | %s\n",
		f.PodName,
		timestamp,
		level,
		entry.Message,
	)

	return []byte(logLine), nil
}

func (l *Logger) LogInfo(message string) {
	l.Info(message)
}

func (l *Logger) LogError(message string, err error) {
	if err != nil {
		message = fmt.Sprintf("%s | error: %v", message, err)
	}
	l.Error(message)
}

func (l *Logger) LogDebug(message string) {
	l.Debug(message)
}

func (l *Logger) LogWarn(message string) {
	l.Warn(message)
}

func (l *Logger) LogInfoWithUser(ctx context.Context, userID int64, message string) {
	msg := fmt.Sprintf("User %d: %s", userID, message)
	l.Info(msg)
}

func (l *Logger) LogErrorWithUser(ctx context.Context, userID int64, message string, err error) {
	msg := fmt.Sprintf("User %d: %s", userID, message)
	if err != nil {
		msg = fmt.Sprintf("%s | error: %v", msg, err)
	}
	l.Error(msg)
}
