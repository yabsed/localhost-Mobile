import React, { useState } from "react";
import { Alert, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../../styles/globalStyles";
import { useAuthStore } from "../../store/useAuthStore";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const AuthModal = ({ visible, onClose }: Props) => {
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordConfirmInput, setPasswordConfirmInput] = useState("");
  const { token, role, username, isLoading, login, signup, logout } = useAuthStore();
  const isAuthenticated = Boolean(token);

  const resetPasswordFields = () => {
    setPasswordInput("");
    setPasswordConfirmInput("");
  };

  const handleAuthSubmit = async () => {
    if (authMode === "signup" && passwordInput !== passwordConfirmInput) {
      Alert.alert("회원가입 실패", "비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    try {
      if (authMode === "login") {
        await login(usernameInput, passwordInput);
      } else {
        await signup(usernameInput, passwordInput);
      }
      resetPasswordFields();
      onClose();
      Alert.alert(authMode === "login" ? "로그인 완료" : "회원가입 완료", "정상적으로 처리되었습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "처리에 실패했습니다.";
      Alert.alert(authMode === "login" ? "로그인 실패" : "회원가입 실패", message);
    }
  };

  const handleLogout = () => {
    logout();
    resetPasswordFields();
    Alert.alert("로그아웃 완료", "로그아웃되었습니다.");
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.activitiesModalView}>
          <Text style={styles.modalTitle}>{isAuthenticated ? "내 계정" : "로그인 / 회원가입"}</Text>

          {!isAuthenticated ? (
            <>
              <View style={styles.boardTabContainer}>
                <TouchableOpacity
                  style={[styles.boardTabButton, authMode === "login" ? styles.boardTabButtonActive : null]}
                  onPress={() => setAuthMode("login")}
                >
                  <Text style={[styles.boardTabText, authMode === "login" ? styles.boardTabTextActive : null]}>
                    로그인
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.boardTabButton, authMode === "signup" ? styles.boardTabButtonActive : null]}
                  onPress={() => setAuthMode("signup")}
                >
                  <Text style={[styles.boardTabText, authMode === "signup" ? styles.boardTabTextActive : null]}>
                    회원가입
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.participatedStoreItem}>
                <TextInput
                  style={styles.authInput}
                  placeholder="아이디"
                  placeholderTextColor="#8b8b8b"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={usernameInput}
                  onChangeText={setUsernameInput}
                />
                <TextInput
                  style={styles.authInput}
                  placeholder="비밀번호"
                  placeholderTextColor="#8b8b8b"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                />
                {authMode === "signup" ? (
                  <TextInput
                    style={[styles.authInput, styles.authInputNoMargin]}
                    placeholder="비밀번호 확인"
                    placeholderTextColor="#8b8b8b"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    value={passwordConfirmInput}
                    onChangeText={setPasswordConfirmInput}
                  />
                ) : null}
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, styles.modalCloseButton]}
                  onPress={onClose}
                >
                  <Text style={styles.buttonText}>닫기</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton, isLoading ? styles.authActionDisabled : null]}
                  disabled={isLoading}
                  onPress={() => {
                    void handleAuthSubmit();
                  }}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? "처리 중..." : authMode === "login" ? "로그인" : "회원가입"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.coinOverviewCard}>
                <Text style={styles.coinOverviewTitle}>현재 로그인 계정</Text>
                <Text style={styles.coinOverviewTotal}>{username ?? "사용자"}</Text>
                <Text style={styles.coinOverviewMeta}>{role ? `역할: ${role}` : "역할 정보 없음"}</Text>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleLogout}>
                  <Text style={styles.buttonText}>로그아웃</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, styles.modalCloseButton]}
                  onPress={onClose}
                >
                  <Text style={styles.buttonText}>닫기</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};
