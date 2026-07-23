import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

type Category = { id: string; name: string };
type Product = { id: string; name: string; sku: string; quantity: number; category_id: string | null; categories: { name: string } | null };

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const [productsResult, categoriesResult] = await Promise.all([
      supabase.from('products').select('id,name,sku,quantity,category_id,categories(name)').order('name'),
      supabase.from('categories').select('id,name').order('name'),
    ]);
    setError(productsResult.error?.message ?? categoriesResult.error?.message ?? '');
    setProducts((productsResult.data ?? []) as unknown as Product[]);
    setCategories((categoriesResult.data ?? []) as Category[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const shown = products.filter((product) => `${product.name} ${product.sku} ${product.categories?.name ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const lowStock = products.filter((product) => product.quantity <= 5).length;

  return <View style={styles.screen}><SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}><Text style={styles.brand}>LO<Text style={styles.accent}>Track</Text></Text><Text style={styles.subtitle}>Mobile inventory companion</Text></View>
      <View style={styles.cards}><Metric label="Products" value={products.length}/><Metric label="Units in stock" value={products.reduce((sum, product) => sum + product.quantity, 0)}/><Metric label="Low stock" value={lowStock}/><Metric label="Categories" value={categories.length}/></View>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search products or categories" placeholderTextColor="#64748b" style={styles.input}/>
      <View style={styles.section}><View style={styles.row}><Text style={styles.title}>Products</Text><Pressable onPress={load}><Text style={styles.link}>Refresh</Text></Pressable></View>
        {loading ? <ActivityIndicator color="#34d399"/> : error ? <Text style={styles.error}>{error}</Text> : shown.length === 0 ? <Text style={styles.empty}>No products match your search.</Text> : shown.map(product =>
          <View key={product.id} style={styles.product}><View><Text style={styles.productName}>{product.name}</Text><Text style={styles.meta}>{product.sku} · {product.categories?.name ?? 'Uncategorized'}</Text></View><Text style={product.quantity <= 5 ? styles.low : styles.stock}>{product.quantity}</Text></View>)}
      </View>
      <View style={styles.note}><Text style={styles.noteTitle}>Catalog management</Text><Text style={styles.meta}>The mobile app uses the same tenant-safe categories and product data as web. Full product editing remains optimized for the web workspace in this release.</Text></View>
    </ScrollView>
  </SafeAreaView></View>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <View style={styles.card}><Text style={styles.metric}>{value}</Text><Text style={styles.meta}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#020617' }, safe: { flex: 1 }, content: { padding: 20, gap: 20 },
  header: { paddingVertical: 16 }, brand: { color: '#fff', fontSize: 32, fontWeight: '800' }, accent: { color: '#34d399' },
  subtitle: { color: '#94a3b8', marginTop: 4 }, cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '47%', backgroundColor: '#0f172a', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1e293b' },
  metric: { color: '#fff', fontSize: 26, fontWeight: '700' }, meta: { color: '#94a3b8', fontSize: 13, marginTop: 3 },
  input: { backgroundColor: '#0f172a', color: '#fff', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 15 },
  section: { backgroundColor: '#0f172a', borderRadius: 22, padding: 18, gap: 12 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' }, link: { color: '#34d399', fontWeight: '600' },
  product: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  productName: { color: '#fff', fontWeight: '600' }, stock: { color: '#34d399', fontSize: 18, fontWeight: '700' },
  low: { color: '#fbbf24', fontSize: 18, fontWeight: '700' }, error: { color: '#fb7185' }, empty: { color: '#94a3b8', paddingVertical: 20 },
  note: { backgroundColor: '#064e3b55', borderRadius: 20, padding: 18 }, noteTitle: { color: '#6ee7b7', fontWeight: '700' },
});
