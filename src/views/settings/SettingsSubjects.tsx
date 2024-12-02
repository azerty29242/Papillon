import React, { useEffect, useState, useCallback, useLayoutEffect, useMemo } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Text, TextInput, TouchableOpacity, View, Modal, StyleSheet, Button } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import Reanimated, { ZoomIn, ZoomOut } from "react-native-reanimated";
import debounce from "lodash/debounce";
import { NativeItem, NativeList, NativeText } from "@/components/Global/NativeComponents";
import { useCurrentAccount } from "@/stores/account";
import MissingItem from "@/components/Global/MissingItem";
import BottomSheet from "@/components/Modals/PapillonBottomSheet";
import { Trash2, Palette } from "lucide-react-native";
import ColorIndicator from "@/components/Lessons/ColorIndicator";
import { COLORS_LIST } from "@/services/shared/Subject";
import type { Screen } from "@/router/helpers/types";
import SubjectContainerCard from "@/components/Settings/SubjectContainerCard";
import ButtonCta from "@/components/FirstInstallation/ButtonCta";

const MemoizedNativeItem = React.memo(NativeItem);
const MemoizedNativeList = React.memo(NativeList);
const MemoizedNativeText = React.memo(NativeText);
const MemoizedSubjectContainerCard = React.memo(SubjectContainerCard);

type Item = [key: string, value: { color: string; pretty: string; emoji: string; }];

const SettingsSubjects: Screen<"SettingsSubjects"> = ({ navigation }) => {
  const account = useCurrentAccount(store => store.account!);
  const mutateProperty = useCurrentAccount(store => store.mutateProperty);
  const insets = useSafeAreaInsets();
  const colors = useTheme().colors;

  const [subjects, setSubjects] = useState<Array<Item>>([]);
  const [localSubjects, setLocalSubjects] = useState<Array<Item>>([]);
  const [selectedSubject, setSelectedSubject] = useState<Item | null>(null);
  const [opened, setOpened] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(""); // New state for unsynced text input

  const emojiInput = React.useRef<TextInput>(null);

  useEffect(() => {
    if (subjects.length === 0 && account.personalization.subjects) {
      const initialSubjects = Object.entries(account.personalization.subjects);
      setSubjects(initialSubjects);
      setLocalSubjects(initialSubjects);
    }
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      setCurrentTitle(selectedSubject[1].pretty);
    }
  }, [selectedSubject]);

  const updateSubject = useCallback((subjectKey: string, updates: Partial<Item[1]>) => {
    setSubjects(prevSubjects =>
      prevSubjects.map(subject =>
        subject[0] === subjectKey ? [subject[0], { ...subject[1], ...updates }] : subject
      )
    );
  }, []);

  const debouncedUpdateSubject = useMemo(
    () => debounce((subjectKey: string, updates: Partial<Item[1]>) => {
      updateSubject(subjectKey, updates);
      setOnSubjects(localSubjects);
    }, 1000),
    [updateSubject, localSubjects]
  );

  const handleSubjectTitleChange = useCallback((newTitle: string) => {
    setCurrentTitle(newTitle);
  }, []);

  const handleSubjectTitleBlur = useCallback(() => {
    if (selectedSubject && currentTitle.trim() !== "") {
      setLocalSubjects(prevSubjects =>
        prevSubjects.map(subject =>
          subject[0] === selectedSubject[0] ? [subject[0], { ...subject[1], pretty: currentTitle }] : subject
        )
      );
      debouncedUpdateSubject(selectedSubject[0], { pretty: currentTitle });
    }
  }, [selectedSubject, currentTitle, debouncedUpdateSubject]);

  const handleSubjectEmojiChange = useCallback((subjectKey: string, newEmoji: string) => {
    let emoji = "";
    if(newEmoji.length >= 1) {
      var regexp = /((\ud83c[\udde6-\uddff]){2}|([#*0-9]\u20e3)|(\u00a9|\u00ae|[\u2000-\u3300]|[\ud83c-\ud83e][\ud000-\udfff])((\ud83c[\udffb-\udfff])?(\ud83e[\uddb0-\uddb3])?(\ufe0f?\u200d([\u2000-\u3300]|[\ud83c-\ud83e][\ud000-\udfff])\ufe0f?)?)*)/g;
      const emojiMatch = newEmoji.match(regexp);
      if(emojiMatch) {
        emoji = emojiMatch[emojiMatch.length - 1];
      }
    }
    setLocalSubjects(prevSubjects =>
      prevSubjects.map(subject =>
        subject[0] === subjectKey ? [subject[0], { ...subject[1], emoji }] : subject
      )
    );
    debouncedUpdateSubject(subjectKey, { emoji });
  }, [debouncedUpdateSubject]);

  const handleSubjectColorChange = useCallback((subjectKey: string, newColor: string) => {
    setLocalSubjects(prevSubjects =>
      prevSubjects.map(subject =>
        subject[0] === subjectKey ? [subject[0], { ...subject[1], color: newColor }] : subject
      )
    );
    debouncedUpdateSubject(subjectKey, { color: newColor });
  }, [debouncedUpdateSubject]);

  const setOnSubjects = useCallback((newSubjects: Item[]) => {
    setSubjects(newSubjects);
    mutateProperty("personalization", {
      ...account.personalization,
      subjects: Object.fromEntries(newSubjects),
    });
  }, [account.personalization, mutateProperty]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              "Réinitialiser les matières",
              "Voulez-vous vraiment réinitialiser les matières ?",
              [
                { text: "Annuler", style: "cancel" },
                { text: "Réinitialiser", style: "destructive", onPress: () => {
                  setSubjects([]);
                  setLocalSubjects([]);
                  setCurrentTitle("");

                  mutateProperty("personalization", {
                    ...account.personalization,
                    subjects: {},
                  });
                }},
              ]
            );
          }}
          style={{ marginRight: 2 }}
        >
          <Trash2 size={22} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.primary]);

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.2)",
    },
    modalContent: {
      width: "80%",
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 20,
      borderColor: colors.border,
      borderWidth: 1
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 20,
      textAlign: "center",
      color: colors.text
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },
    colorPreview: {
      width: 40,
      height: 40,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 10,
    },
    input: {
      flex: 1,
      height: 40,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 5,
      paddingHorizontal: 10,
      textAlignVertical: "center",
      color: colors.text
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    button: {
      flex: 1,
      marginHorizontal: 5,
      paddingVertical: 10,
      borderRadius: 20,
      alignItems: "center",
    },
    buttonText: {
      color: "white",
      fontWeight: "bold",
    },
  });

  const [isModalVisible, setModalVisible] = useState(false);
  const [customColor, setCustomColor] = useState("");
  const [disabledValidate, setDisableValidate] = useState(true);

  const openHexColorPicker = () => {
    setModalVisible(true);
  };

  const closeHexColorPicker = () => {
    setModalVisible(false);
    setCustomColor("");
  };

  const renderSubjectItem = useCallback(({ item: subject, index }: { item: Item, index: number }) => {
    if (!subject[0] || !subject[1] || !subject[1].emoji || !subject[1].pretty || !subject[1].color)
      return null;

    return (
      <MemoizedNativeItem
        onPress={() => {
          setSelectedSubject(subject);
          setCurrentTitle(subject[1].pretty);
          setOpened(true);
        }}
        separator={index !== localSubjects.length - 1}
        leading={
          <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
            <View
              style={{
                width: 4,
                height: 40,
                borderRadius: 8,
                backgroundColor: subject[1].color || "#000000",
              }}
            />
            <Text style={{ fontSize: 26 }}>{subject[1].emoji || "🎨"}</Text>
          </View>
        }
      >
        <MemoizedNativeText variant="title" numberOfLines={2}>
          {subject[1].pretty || "Matière"}
        </MemoizedNativeText>
        <MemoizedNativeText variant="subtitle" numberOfLines={2}>
          {subject[1].color || "Sans couleur"}
        </MemoizedNativeText>
      </MemoizedNativeItem>
    );
  }, []);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={insets.top + 44}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: 0,
          paddingBottom: 16 + insets.bottom,
        }}
      >
        {localSubjects.length > 0 && selectedSubject && (
          <BottomSheet
            opened={opened}
            setOpened={(bool: boolean) => {
              if (localSubjects.find((subject) => subject[0] === selectedSubject[0])?.[1].emoji != "") {
                setOpened(bool);
                if (!bool) {
                  handleSubjectTitleBlur(); // Update subject title when closing the bottom sheet
                }
              } else {
                Alert.alert("Aucun émoji défini", "Vous devez définir un émoji pour cette matière avant de pouvoir quitter cette page.");
                emojiInput.current?.focus();
              }
            }}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {selectedSubject && (
              <>
                <MemoizedNativeList>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      justifyContent: "flex-start",
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      gap: 14,
                    }}
                  >
                    <ColorIndicator style={{ flex: 0 }} color={selectedSubject[1].color} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <MemoizedNativeText variant="title" numberOfLines={2}>
                        {currentTitle}
                      </MemoizedNativeText>
                      <MemoizedNativeText
                        variant="subtitle"
                        style={{
                          backgroundColor: selectedSubject[1].color + "22",
                          color: selectedSubject[1].color,
                          alignSelf: "flex-start",
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8,
                          overflow: "hidden",
                          borderCurve: "continuous",
                          opacity: 1,
                        }}
                      >
                        Papillon Park
                      </MemoizedNativeText>
                      <MemoizedNativeText variant="subtitle">
                        HLR T.
                      </MemoizedNativeText>
                    </View>
                  </View>
                </MemoizedNativeList>

                <View style={{ flexDirection: "row", gap: 16 }}>
                  <MemoizedNativeList style={{ marginTop: 16, width: 72 }}>
                    <MemoizedNativeItem
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                        height: 64,
                        width: 42,
                      }}
                    >
                      <TextInput
                        ref={emojiInput}
                        style={{
                          fontFamily: "medium",
                          fontSize: 26,
                          color: colors.text,
                          textAlign: "center",
                          textAlignVertical: "center",
                          padding: 0,
                          height: 46,
                          width: 42,
                        }}
                        value={selectedSubject[1].emoji}
                        onChangeText={(newEmoji) => handleSubjectEmojiChange(selectedSubject[0], newEmoji)}
                      />
                    </MemoizedNativeItem>
                  </MemoizedNativeList>

                  <MemoizedNativeList style={{ marginTop: 16, flex: 1 }}>
                    <MemoizedNativeItem>
                      <MemoizedNativeText variant="subtitle" numberOfLines={1}>
                        Nom de la matière
                      </MemoizedNativeText>
                      <TextInput
                        style={{
                          fontFamily: "medium",
                          fontSize: 16,
                          color: colors.text,
                        }}
                        value={currentTitle}
                        onChangeText={handleSubjectTitleChange}
                        onBlur={handleSubjectTitleBlur}
                      />
                    </MemoizedNativeItem>
                  </MemoizedNativeList>
                </View>

                <MemoizedNativeList style={{ marginTop: 16 }}>
                  <MemoizedNativeItem>
                    <MemoizedNativeText variant="subtitle">
                      Couleur
                    </MemoizedNativeText>

                    <FlatList
                      style={{
                        marginHorizontal: -18,
                        paddingHorizontal: 12,
                        marginTop: 4,
                      }}
                      data={COLORS_LIST}
                      horizontal
                      keyExtractor={(item) => item}
                      ListFooterComponent={<View style={{ width: 16 }} />}
                      showsHorizontalScrollIndicator={false}
                      renderItem={({ item }) => {
                        if (item === "colorPicker") {
                          return (
                            <TouchableOpacity
                              onPress={() => {
                                openHexColorPicker();
                              }}
                            >
                              <View
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 80,
                                  backgroundColor: "transparent",
                                  borderColor: colors.text,
                                  borderWidth: 2,
                                  marginHorizontal: 5,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Palette color={colors.text}></Palette>
                              </View>
                            </TouchableOpacity>
                          );
                        }

                        return (
                          <TouchableOpacity
                            onPress={() => handleSubjectColorChange(selectedSubject[0], item)}
                          >
                            <View
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 80,
                                backgroundColor: item,
                                marginHorizontal: 5,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {selectedSubject[1].color === item && (
                                <Reanimated.View
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 80,
                                    backgroundColor: item,
                                    borderColor: colors.background,
                                    borderWidth: 3,
                                  }}
                                  entering={ZoomIn.springify().mass(1).damping(20).stiffness(300)}
                                  exiting={ZoomOut.springify().mass(1).damping(20).stiffness(300)}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      }}
                    />
                    {isModalVisible && (
                      <MemoizedNativeList>
                        <MemoizedNativeItem>
                          <MemoizedNativeText variant="subtitle" numberOfLines={1}>
                            Écrire la couleur (6 caractères)
                          </MemoizedNativeText>
                          <TextInput
                            style={{
                              fontFamily: "medium",
                              fontSize: 16,
                              color: colors.text,
                            }}
                            value={customColor.startsWith("#") ? customColor : "#" + customColor}
                            onChangeText={(text) => {
                              if (!text.startsWith("#") || Number.isNaN(parseInt(text.split("#")[1]))) {
                                text = "#";
                              }

                              const validText = text.slice(0, 7).toUpperCase();
                              setCustomColor(validText);
                              if (/^#[0-9A-F]{6}$/i.test(validText)) {
                                setDisableValidate(false);
                              } else {
                                setDisableValidate(true);
                              }
                            }}
                            autoFocus
                          />
                        </MemoizedNativeItem>
                      </MemoizedNativeList>
                    )}
                  </MemoizedNativeItem>
                </MemoizedNativeList>
                <Modal
                  visible={isModalVisible}
                  transparent
                  animationType="slide"
                  onRequestClose={closeHexColorPicker}
                >
                  <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>Choisis une couleur</Text>
                      <View style={styles.inputContainer}>
                        <View
                          style={[
                            styles.colorPreview,
                            { backgroundColor: /^#[0-9A-F]{6}$/i.test(customColor) ? customColor : colors.text },
                          ]}
                        />
                        <TextInput
                          style={styles.input}
                          value={customColor.startsWith("#") ? customColor : "#" + customColor}
                          onChangeText={(text) => {
                            if (!text.startsWith("#")) {
                              text = "#" + text;
                            }
                            const validText = text.slice(0, 7).toUpperCase();
                            setCustomColor(validText);
                            if (/^#[0-9A-F]{6}$/i.test(validText)) {
                              setDisableValidate(false);
                            } else {
                              setDisableValidate(true);
                            }
                          }}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                      <View style={styles.buttonContainer}>
                        <ButtonCta value="Annuler" disabled={ false } style={{ backgroundColor: colors.primary, minWidth: "10%", width: "75%" }} onPress={closeHexColorPicker}/>
                        <ButtonCta
                          value="Appliquer"
                          disabled={ disabledValidate }
                          primary
                          style={{ backgroundColor: colors.primary, minWidth: "10%", width: "75%" }}
                          onPress={() => {
                            if (/^#[0-9A-F]{6}$/i.test(customColor)) {
                              handleSubjectColorChange(selectedSubject[0], customColor);
                              closeHexColorPicker();
                            }
                          }}
                        />
                      </View>
                    </View>
                  </View>
                </Modal>
              </>
            )}
          </BottomSheet>
        )}

        <MemoizedSubjectContainerCard theme={{ colors }} />

        {localSubjects.length > 0 ? (
          <NativeList>
            <FlatList
              data={localSubjects}
              renderItem={renderSubjectItem}
              keyExtractor={(item) => item[0]}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
            />
          </NativeList>
        ) : (
          <MissingItem
            style={{ marginTop: 16 }}
            emoji={"🎨"}
            title={"Une matière manque ?"}
            description={"Essayez d'ouvrir quelques journées dans votre emploi du temps"}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default React.memo(SettingsSubjects);