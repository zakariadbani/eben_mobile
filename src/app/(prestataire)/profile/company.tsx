import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { getBrands, getPrestataireCompany, updatePrestataireCompany } from '@/api';
import Button from '@/components/common/Button';
import CustomHeader from '@/components/common/CustomHeader';
import CustomIcon from '@/components/common/CustomIcon';
import Icon from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import View from '@/components/common/View';
import Colors from '@/constants/Colors';
import type { PrestataireCompany } from '@/interfaces/PrestataireCompany';
import type { CarBrand } from '@/interfaces/Vehicle';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  onSupport: () => void;
  supportLabel: string;
}

function SectionCard({ title, children, onSupport, supportLabel }: SectionCardProps): React.ReactElement {
  return (
    <View style={styles.card}>
      <View flexDirection="row" alignItems="center" style={styles.cardHeader}>
        <Text type="subTitle" semiBold color={Colors.brand} flex>{title}</Text>
        <TouchableOpacity style={styles.supportButton} onPress={onSupport} accessibilityRole="button">
          <Text type="small" color={Colors.grayMidDark}>{supportLabel}</Text>
          <Icon name="headphones" size={14} iconColor={Colors.grayMidDark} type="Feather" />
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

function DataLine({ label, value }: { label: string; value?: string | null }): React.ReactElement | null {
  return value ? <Text type="small" color={Colors.grayMidDark} translate={false} style={styles.dataLine}>{`${label}: ${value}`}</Text> : null;
}

export default function CompanyScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isArabic = i18n.language === 'ar';
  const [company, setCompany] = useState<PrestataireCompany | null>(null);
  const [brands, setBrands] = useState<CarBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [companyResponse, brandsResponse] = await Promise.all([
        getPrestataireCompany(),
        getBrands(),
      ]);
      setCompany(companyResponse.data);
      setBrands(brandsResponse.data.filter((brand) => brand.status));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const brandById = useMemo(() => new Map(brands.map((brand) => [brand.id, brand])), [brands]);
  const labelFor = useCallback((id: number): string => {
    const brand = brandById.get(id);
    return (isArabic ? brand?.nameAr : brand?.name) ?? brand?.name ?? `#${id}`;
  }, [brandById, isArabic]);
  const specializations = company?.specializations ?? [];
  const visibleSpecializations = specializations.filter((id) =>
    labelFor(id).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  const showSupport = (section: string) => Alert.alert(
    t('partner.company.modifyRequestTitle'),
    t('partner.company.modifyRequestBody', { section }),
    [{ text: t('Fermer'), style: 'cancel' }],
  );

  const saveSpecializations = async (ids: number[]): Promise<boolean> => {
    setSaving(true);
    try {
      const response = await updatePrestataireCompany({ specializations: ids });
      setCompany(response.data);
      return true;
    } catch {
      Alert.alert(t('partner.company.saveError'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addBrand = async () => {
    if (!selectedBrandId) return;
    if (specializations.includes(selectedBrandId)) {
      Alert.alert(t('partner.company.brandAlreadyAdded'));
      return;
    }
    if (await saveSpecializations([...specializations, selectedBrandId])) {
      setSelectedBrandId(null);
      setPickerOpen(false);
    }
  };

  const confirmRemove = (brandId: number) => Alert.alert(
    t('partner.company.removeBrandTitle'),
    t('partner.company.removeBrandBody'),
    [
      { text: t('Annuler'), style: 'cancel' },
      {
        text: t('partner.company.removeBrandConfirm'),
        style: 'destructive',
        onPress: () => { void saveSpecializations(specializations.filter((id) => id !== brandId)); },
      },
    ],
  );

  const header = (
    <CustomHeader>
      <View flexDirection="row" alignItems="center" style={styles.headerRow}>
        <Text type="headerTitle" color={Colors.brand} flex>{t('partner.company.title')}</Text>
        <TouchableOpacity onPress={() => router.push('/(prestataire)/profile/notifications' as never)} accessibilityRole="button" accessibilityLabel={t('partner.notifications.title')}>
          <CustomIcon name="notif" size={27} />
        </TouchableOpacity>
      </View>
    </CustomHeader>
  );

  if (loading) return <Screen whatsapp={false} edges={['bottom']}>{header}<View flex alignItems="center" justifyContent="center"><ActivityIndicator color={Colors.primary} size="large" /></View></Screen>;
  if (error || !company) return (
    <Screen whatsapp={false} edges={['bottom']}>{header}<View flex alignItems="center" justifyContent="center" p={24}>
      <Text type="label" color={Colors.grayMidDark} center>{t('partner.company.loadError')}</Text>
      <Button title={t('partner.company.retry')} onPress={() => { void load(); }} style={styles.retry} />
    </View></Screen>
  );

  return (
    <Screen whatsapp scrollable={false} edges={['bottom']}>
      {header}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionCard title={t('partner.company.sectionAddress')} supportLabel={t('partner.company.modifyRequest')} onSupport={() => showSupport(t('partner.company.sectionAddress'))}>
          <DataLine label={t('partner.company.street')} value={company.addressLine1} />
          <DataLine label={t('partner.company.addressExtra')} value={company.addressLine2} />
          <DataLine label={t('partner.company.city')} value={company.city} />
          <DataLine label={t('partner.company.region')} value={company.region} />
        </SectionCard>
        <SectionCard title={t('partner.company.sectionInfo')} supportLabel={t('partner.company.modifyRequest')} onSupport={() => showSupport(t('partner.company.sectionInfo'))}>
          <DataLine label="ICE" value={company.ice} />
          <DataLine label="RC" value={company.rc} />
          <DataLine label={t('partner.company.taxId')} value={company.taxId} />
          <DataLine label={t('partner.company.legalName')} value={company.legalName} />
        </SectionCard>
        <SectionCard title={t('partner.company.sectionBank')} supportLabel={t('partner.company.modifyRequest')} onSupport={() => showSupport(t('partner.company.sectionBank'))}>
          <Text type="label" color={Colors.grayMidDark}>{t('partner.company.bankSupportOnly')}</Text>
        </SectionCard>

        <View style={styles.brandsSection}>
          <View flexDirection="row" alignItems="center" style={styles.brandsHeader}>
            <Text type="subTitle" semiBold color={Colors.brand} flex>{t('partner.company.sectionBrands')}</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setPickerOpen(true)} accessibilityRole="button">
              <Text type="label" color={Colors.grayMidDark}>{t('partner.company.addBrandCta')}</Text>
              <Icon name="plus" size={18} iconColor={Colors.brand} type="Feather" />
            </TouchableOpacity>
          </View>
          <View style={styles.search} flexDirection="row" alignItems="center" gap={8}>
            <Icon name="search" size={16} iconColor={Colors.gray} type="Feather" />
            <RNTextInput value={query} onChangeText={setQuery} placeholder={t('partner.company.searchPlaceholder')} placeholderTextColor={Colors.gray} style={[styles.input, isArabic && styles.inputRtl]} />
          </View>
          {visibleSpecializations.length === 0 ? (
            <Text type="label" color={Colors.gray} center style={styles.empty}>{query ? t('partner.company.noBrandResults') : t('partner.company.noBrands')}</Text>
          ) : visibleSpecializations.map((id) => (
            <View key={id} style={styles.brandRow} flexDirection="row" alignItems="center">
              <Text type="label" semiBold color={Colors.brand} translate={false} flex>{labelFor(id)}</Text>
              <TouchableOpacity onPress={() => confirmRemove(id)} disabled={saving} accessibilityRole="button" accessibilityLabel={t('partner.company.removeBrandAccessibility', { brand: labelFor(id) })}>
                <Icon name="x-circle" size={20} iconColor={Colors.gray} type="Feather" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} onPress={() => setPickerOpen(false)} activeOpacity={1} accessibilityLabel={t('Fermer')} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text type="subTitle" semiBold color={Colors.brand} style={styles.sheetTitle}>{t('partner.company.sheetTitle')}</Text>
            <ScrollView style={styles.picker}>
              {brands.map((brand) => {
                const label = labelFor(brand.id);
                const selected = selectedBrandId === brand.id;
                return (
                  <TouchableOpacity key={brand.id} style={[styles.pickerItem, selected && styles.pickerItemActive]} onPress={() => setSelectedBrandId(brand.id)} accessibilityRole="radio" accessibilityState={{ selected }}>
                    <Text type="label" color={selected ? Colors.brand : Colors.grayMidDark} translate={false}>{label}</Text>
                    {selected ? <Icon name="check" size={16} iconColor={Colors.primary} type="Feather" /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Button title={saving ? t('partner.company.sheetSaving') : t('partner.company.sheetCta')} onPress={() => { void addBrand(); }} disabled={saving || selectedBrandId === null} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flex: 1 },
  scroll: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { paddingBottom: 40 },
  card: { backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 14, borderRadius: 5, padding: 16, shadowColor: Colors.borderLight, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 7, elevation: 3 },
  cardHeader: { marginBottom: 10 },
  supportButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  dataLine: { marginBottom: 4 },
  brandsSection: { marginTop: 24, padding: 16 },
  brandsHeader: { marginBottom: 12 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  search: { backgroundColor: Colors.backgroundGray, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  input: { flex: 1, fontFamily: 'Roboto', fontSize: 14, color: Colors.brand, padding: 0 },
  inputRtl: { textAlign: 'right', writingDirection: 'rtl' },
  empty: { paddingVertical: 16 },
  brandRow: { minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight, gap: 12 },
  retry: { marginTop: 16 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: '80%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { marginBottom: 16 },
  picker: { maxHeight: 320, marginBottom: 16, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 8 },
  pickerItem: { minHeight: 46, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  pickerItemActive: { backgroundColor: Colors.backgroundGray },
});
