import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/database/supabase';
import { useTheme } from '@/hooks/use-theme';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Producto = {
  id: number;
  nombre: string;
  proveedor: string;
  precio: number;
  stock: number;
};

export default function ProductsScreen() {
  const theme = useTheme();

  const [products, setProducts] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado del formulario que aparece en el Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [nombre, setNombre] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('products').select('*').order('id');

      if (error) {
        Alert.alert('Ha ocurrido un error', error.message);
        return;
      }

      // Supabase devuelve las filas sin tipos, así que las casteamos.
      setProducts((data ?? []) as Producto[]);
    } catch (err) {
      Alert.alert('Ha ocurrido un error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProducts();
  }, []);

  const abrirNuevo = () => {
    setProductoEditando(null);
    setNombre('');
    setProveedor('');
    setPrecio('');
    setStock('');
    setModalVisible(true);
  };

  const abrirEdicion = (producto: Producto) => {
    setProductoEditando(producto);
    setNombre(producto.nombre);
    setProveedor(producto.proveedor);
    setPrecio(String(producto.precio));
    setStock(String(producto.stock));
    setModalVisible(true);
  };

  const guardarProducto = async () => {
    if (!nombre.trim() || !proveedor.trim()) {
      Alert.alert('Datos incompletos', 'El nombre y el proveedor son obligatorios.');
      return;
    }

    const precioNum = Number(precio);
    const stockNum = Number(stock);

    if (Number.isNaN(precioNum) || precioNum < 0 || Number.isNaN(stockNum) || stockNum < 0) {
      Alert.alert('Valores inválidos', 'El precio y el stock deben ser números iguales o mayores a 0.');
      return;
    }

    setGuardando(true);
    try {
      const datos = {
        nombre: nombre.trim(),
        proveedor: proveedor.trim(),
        precio: precioNum,
        stock: stockNum,
      };

      // Si hay un producto en edición hacemos UPDATE, si no, INSERT.
      const resultado = productoEditando
        ? await supabase.from('products').update(datos).eq('id', productoEditando.id)
        : await supabase.from('products').insert(datos);

      if (resultado.error) {
        Alert.alert('Ha ocurrido un error', resultado.error.message);
        return;
      }

      setModalVisible(false);
      cargarProducts();
    } catch (err) {
      Alert.alert('Ha ocurrido un error', err instanceof Error ? err.message : String(err));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarProducto = async (producto: Producto) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', producto.id);

      if (error) {
        Alert.alert('Ha ocurrido un error', error.message);
        return;
      }

      setProducts((prev) => prev.filter((item) => item.id !== producto.id));
    } catch (err) {
      Alert.alert('Ha ocurrido un error', err instanceof Error ? err.message : String(err));
    }
  };

  const confirmarEliminacion = (producto: Producto) => {
    // En web, Alert.alert no muestra diálogos; usamos el confirm del navegador.
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (window.confirm(`¿Deseas eliminar "${producto.nombre}"?`)) {
        eliminarProducto(producto);
      }
      return;
    }

    Alert.alert('Eliminar producto', `¿Deseas eliminar "${producto.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarProducto(producto) },
    ]);
  };

  const renderItem = ({ item }: { item: Producto }) => (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedView type="backgroundElement" style={styles.cardInfo}>
        <ThemedText type="smallBold">{item.nombre}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.proveedor} · Stock: {item.stock}
        </ThemedText>
        <ThemedText type="smallBold">Q{item.precio}</ThemedText>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.cardActions}>
        <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={() => abrirEdicion(item)}>
          <ThemedView type="backgroundSelected" style={styles.editButton}>
            <ThemedText type="small" style={styles.editButtonText}>
              Editar
            </ThemedText>
          </ThemedView>
        </Pressable>

        <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={() => confirmarEliminacion(item)}>
          <ThemedView style={styles.deleteButton}>
            <ThemedText type="small" style={styles.deleteButtonText}>
              Eliminar
            </ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">Productos</ThemedText>
          <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={abrirNuevo}>
            <ThemedView type="backgroundSelected" style={styles.newProductButton}>
              <ThemedText type="small" style={styles.editButtonText}>
                + Nuevo producto
              </ThemedText>
            </ThemedView>
          </Pressable>
        </ThemedView>

        {loading ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            Cargando productos…
          </ThemedText>
        ) : products.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            No hay productos registrados.
          </ThemedText>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalCard}>
            <ThemedText type="subtitle">
              {productoEditando ? 'Editar producto' : 'Nuevo producto'}
            </ThemedText>

            <ThemedView type="backgroundElement" style={styles.field}>
              <ThemedText type="smallBold">Nombre</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej. Laptop Gamer"
                placeholderTextColor={theme.textSecondary}
              />
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.field}>
              <ThemedText type="smallBold">Proveedor</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={proveedor}
                onChangeText={setProveedor}
                placeholder="Ej. Compugangas"
                placeholderTextColor={theme.textSecondary}
              />
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.field}>
              <ThemedText type="smallBold">Precio (Q)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={precio}
                onChangeText={setPrecio}
                placeholder="Ej. 2500.75"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.field}>
              <ThemedText type="smallBold">Stock</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={stock}
                onChangeText={setStock}
                placeholder="Ej. 10"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
              />
            </ThemedView>

            <Pressable disabled={guardando} style={({ pressed }) => pressed && styles.pressed} onPress={guardarProducto}>
              <ThemedView type="backgroundSelected" style={styles.saveButton}>
                <ThemedText type="small" style={styles.saveButtonText}>
                  {guardando ? 'Guardando…' : 'Guardar producto'}
                </ThemedText>
              </ThemedView>
            </Pressable>

            <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={() => setModalVisible(false)}>
              <ThemedView style={styles.cancelButton}>
                <ThemedText type="small" themeColor="textSecondary">
                  Cancelar
                </ThemedText>
              </ThemedView>
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
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
    alignSelf: 'stretch',
  },
  newProductButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
  listContent: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  cardInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  editButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  editButtonText: {
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    alignSelf: 'stretch',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  saveButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  saveButtonText: {
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
});
