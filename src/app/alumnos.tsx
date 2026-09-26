import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { supabase } from "@/database/supabase";
import { useTheme } from "@/hooks/use-theme";
import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Alumno = {
  carnet: number;
  nombre: string;
  carrera: string;
};

type ErroresFormulario = {
  carnet?: string;
  nombre?: string;
  carrera?: string;
  general?: string;
};

export default function AlumnosScreen() {
  const theme = useTheme();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [alumnoEditando, setAlumnoEditando] = useState<Alumno | null>(null);
  const [carnet, setCarnet] = useState("");
  const [nombre, setNombre] = useState("");
  const [carrera, setCarrera] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<ErroresFormulario>({});

  const cargarAlumnos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("alumnos")
        .select("carnet, nombre, carrera")
        .order("carnet");

      if (error) {
        Alert.alert("No se pudieron cargar los estudiantes", error.message);
        return;
      }

      setAlumnos((data ?? []) as Alumno[]);
    } catch (error) {
      Alert.alert(
        "No se pudieron cargar los estudiantes",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAlumnos();
  }, []);

  const alumnosFiltrados = alumnos.filter((alumno) => {
    const termino = busqueda.trim().toLocaleLowerCase();
    return (
      !termino ||
      alumno.nombre.toLocaleLowerCase().includes(termino) ||
      alumno.carrera.toLocaleLowerCase().includes(termino) ||
      String(alumno.carnet).includes(termino)
    );
  });

  const abrirNuevo = () => {
    setAlumnoEditando(null);
    setCarnet("");
    setNombre("");
    setCarrera("");
    setErrores({});
    setModalVisible(true);
  };

  const abrirEdicion = (alumno: Alumno) => {
    setAlumnoEditando(alumno);
    setCarnet(String(alumno.carnet));
    setNombre(alumno.nombre);
    setCarrera(alumno.carrera);
    setErrores({});
    setModalVisible(true);
  };

  const guardarAlumno = async () => {
    const nuevosErrores: ErroresFormulario = {};
    const carnetNum = Number(carnet);
    const nombreLimpio = nombre.trim().replace(/\s+/g, " ");
    const carreraLimpia = carrera.trim().replace(/\s+/g, " ");
    const soloLetras = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]+$/;

    if (
      !/^\d+$/.test(carnet) ||
      !Number.isSafeInteger(carnetNum) ||
      carnetNum <= 0
    ) {
      nuevosErrores.carnet = "Escribe un carnet numérico válido.";
    }
    if (nombreLimpio.length < 2 || !soloLetras.test(nombreLimpio)) {
      nuevosErrores.nombre =
        "Usa al menos 2 letras; no se permiten números ni símbolos.";
    }
    if (carreraLimpia.length < 2 || !soloLetras.test(carreraLimpia)) {
      nuevosErrores.carrera =
        "Escribe una carrera con letras, espacios o guiones.";
    }
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    setErrores({});
    setGuardando(true);
    try {
      const datos = {
        carnet: carnetNum,
        nombre: nombreLimpio,
        carrera: carreraLimpia,
      };
      const resultado = alumnoEditando
        ? await supabase
            .from("alumnos")
            .update(datos)
            .eq("carnet", alumnoEditando.carnet)
        : await supabase.from("alumnos").insert(datos);

      if (resultado.error) {
        setErrores({ general: resultado.error.message });
        return;
      }

      setModalVisible(false);
      await cargarAlumnos();
    } catch (error) {
      setErrores({
        general: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setGuardando(false);
    }
  };

  const eliminarAlumno = async (alumno: Alumno) => {
    try {
      const { error } = await supabase
        .from("alumnos")
        .delete()
        .eq("carnet", alumno.carnet);

      if (error) {
        Alert.alert("No se pudo eliminar", error.message);
        return;
      }

      setAlumnos((actuales) =>
        actuales.filter((item) => item.carnet !== alumno.carnet),
      );
    } catch (error) {
      Alert.alert(
        "No se pudo eliminar",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const confirmarEliminacion = (alumno: Alumno) => {
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (window.confirm(`¿Eliminar el registro de ${alumno.nombre}?`)) {
        eliminarAlumno(alumno);
      }
      return;
    }

    Alert.alert("Eliminar estudiante", `¿Eliminar a ${alumno.nombre}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => eliminarAlumno(alumno),
      },
    ]);
  };

  const renderItem = ({ item }: { item: Alumno }) => {
    const iniciales = item.nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0]?.toLocaleUpperCase() ?? "")
      .join("");

    return (
      <ThemedView type="backgroundElement" style={styles.studentRow}>
        <View style={styles.avatar}>
          <ThemedText type="smallBold" style={styles.avatarText}>
            {iniciales || "A"}
          </ThemedText>
        </View>
        <ThemedView type="backgroundElement" style={styles.studentInfo}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {item.nombre}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {item.carrera}
          </ThemedText>
          <ThemedText type="small" style={styles.carnetLabel}>
            CARNET {item.carnet}
          </ThemedText>
        </ThemedView>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Editar a ${item.nombre}`}
            onPress={() => abrirEdicion(item)}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold" style={styles.editText}>
              Editar
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Eliminar a ${item.nombre}`}
            onPress={() => confirmarEliminacion(item)}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold" style={styles.deleteText}>
              Eliminar
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.heading}>
            <View>
              <ThemedText type="smallBold" style={styles.eyebrow}>
                REGISTRO ACADÉMICO
              </ThemedText>
              <ThemedText type="title">Estudiantes</ThemedText>
            </View>
          </View>

          <View
            style={[
              styles.searchBox,
              { backgroundColor: theme.backgroundElement },
            ]}
          >
            <ThemedText type="smallBold" style={styles.searchMark}>
              Q
            </ThemedText>
            <TextInput
              accessibilityLabel="Buscar estudiantes"
              style={[styles.searchInput, { color: theme.text }]}
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar por nombre, carnet o carrera"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="search"
            />
            {busqueda.length > 0 && (
              <Pressable
                onPress={() => setBusqueda("")}
                accessibilityLabel="Limpiar búsqueda"
              >
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Limpiar
                </ThemedText>
              </Pressable>
            )}
          </View>

          <View style={styles.listHeading}>
            <ThemedText type="smallBold">Directorio</ThemedText>
            <View style={styles.listActions}>
              <Pressable
                onPress={cargarAlumnos}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.textButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.refreshText}>
                  Actualizar
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={abrirNuevo}
                style={({ pressed }) => [
                  styles.newButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.newButtonText}>
                  + Nuevo estudiante
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {loading ? (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.emptyText}
            >
              Cargando estudiantes...
            </ThemedText>
          ) : alumnosFiltrados.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyState}>
              <ThemedText type="subtitle" style={styles.emptyMark}>
                {busqueda ? "?" : "+"}
              </ThemedText>
              <ThemedText type="smallBold">
                {busqueda ? "Sin coincidencias" : "Aún no hay estudiantes"}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.emptyHint}
              >
                {busqueda
                  ? "Prueba con otro nombre, carnet o carrera."
                  : "Agrega el primer registro para comenzar el directorio."}
              </ThemedText>
            </ThemedView>
          ) : (
            <FlatList
              data={alumnosFiltrados}
              keyExtractor={(item) => String(item.carnet)}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </SafeAreaView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalCard}>
            <View style={styles.modalHeading}>
              <View>
                <ThemedText type="smallBold" style={styles.eyebrow}>
                  FICHA ACADÉMICA
                </ThemedText>
                <ThemedText type="subtitle">
                  {alumnoEditando ? "Editar estudiante" : "Nuevo estudiante"}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Cerrar formulario"
              >
                <ThemedText type="subtitle" themeColor="textSecondary">
                  X
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Número de carnet</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.background, color: theme.text },
                ]}
                value={carnet}
                onChangeText={(value) => {
                  setCarnet(value.replace(/\D/g, ""));
                  setErrores((actuales) => ({
                    ...actuales,
                    carnet: undefined,
                    general: undefined,
                  }));
                }}
                placeholder="Ej. 20240001"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                editable={!alumnoEditando}
              />
              {errores.carnet && (
                <ThemedText style={styles.errorText}>
                  {errores.carnet}
                </ThemedText>
              )}
            </View>
            <View style={styles.field}>
              <ThemedText type="smallBold">Nombre completo</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.background, color: theme.text },
                ]}
                value={nombre}
                onChangeText={(value) => {
                  setNombre(value.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]/g, ""));
                  setErrores((actuales) => ({
                    ...actuales,
                    nombre: undefined,
                    general: undefined,
                  }));
                }}
                placeholder="Nombre y apellidos"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
              />
              {errores.nombre && (
                <ThemedText style={styles.errorText}>
                  {errores.nombre}
                </ThemedText>
              )}
            </View>
            <View style={styles.field}>
              <ThemedText type="smallBold">Carrera</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.background, color: theme.text },
                ]}
                value={carrera}
                onChangeText={(value) => {
                  setCarrera(value.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]/g, ""));
                  setErrores((actuales) => ({
                    ...actuales,
                    carrera: undefined,
                    general: undefined,
                  }));
                }}
                placeholder="Ej. Ingeniería en Sistemas"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
              />
              {errores.carrera && (
                <ThemedText style={styles.errorText}>
                  {errores.carrera}
                </ThemedText>
              )}
            </View>

            {errores.general && (
              <ThemedText style={styles.errorText}>
                {errores.general}
              </ThemedText>
            )}

            <Pressable
              disabled={guardando}
              onPress={guardarAlumno}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold" style={styles.saveButtonText}>
                {guardando
                  ? "Guardando..."
                  : alumnoEditando
                    ? "Guardar cambios"
                    : "Registrar estudiante"}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setModalVisible(false)}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="small" themeColor="textSecondary">
                Cancelar
              </ThemedText>
            </Pressable>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: "stretch",
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  content: {
    flex: 1,
    gap: Spacing.three,
    paddingTop: Spacing.five,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  eyebrow: {
    color: "#167A62",
    fontSize: 11,
    letterSpacing: 0,
  },
  newButton: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: Spacing.two,
    borderRadius: 6,
    backgroundColor: "#167A62",
  },
  newButtonText: {
    color: "#FFFFFF",
  },
  summary: {
    minHeight: 94,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: 8,
    backgroundColor: "#167A62",
    gap: Spacing.three,
  },
  summaryMark: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#E3B550",
  },
  summaryMarkText: {
    color: "#173B32",
  },
  summaryCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  summaryTitle: {
    color: "#FFFFFF",
  },
  summarySubtitle: {
    color: "#D5ECE3",
  },
  summaryCount: {
    minWidth: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0F624F",
  },
  summaryCountText: {
    color: "#FFFFFF",
  },
  searchBox: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  searchMark: {
    color: "#167A62",
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  listHeading: {
    gap: Spacing.two,
    alignItems: "stretch",
    paddingTop: Spacing.one,
  },
  listActions: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Spacing.two,
  },
  textButton: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: Spacing.two,
  },
  refreshText: {
    color: "#167A62",
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  studentRow: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: 8,
    gap: Spacing.three,
  },
  avatar: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    backgroundColor: "#DCEFE8",
  },
  avatarText: {
    color: "#14634F",
  },
  studentInfo: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  carnetLabel: {
    color: "#167A62",
    fontSize: 10,
  },
  actions: {
    alignItems: "flex-end",
    gap: Spacing.two,
  },
  actionButton: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: Spacing.two,
  },
  editText: {
    color: "#167A62",
  },
  deleteText: {
    color: "#B5473C",
  },
  emptyText: {
    marginTop: Spacing.five,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.five,
    borderRadius: 8,
    gap: Spacing.two,
  },
  emptyMark: {
    color: "#167A62",
  },
  emptyHint: {
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.four,
    backgroundColor: "rgba(10, 31, 26, 0.55)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    padding: Spacing.four,
    borderRadius: 10,
    gap: Spacing.three,
  },
  modalHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.one,
  },
  field: {
    gap: Spacing.two,
  },
  errorText: {
    color: "#B5473C",
    fontSize: 12,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#D8DFDB",
    borderRadius: 6,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  saveButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.one,
    borderRadius: 8,
    backgroundColor: "#167A62",
  },
  saveButtonText: {
    color: "#FFFFFF",
  },
  cancelButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
