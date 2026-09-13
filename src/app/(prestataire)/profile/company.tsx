/**
 * (prestataire)/profile/company.tsx
 *
 * Informations sur l'entreprise.
 *
 * Figma refs:
 *   - partner/Profile-My-company-information__277-39544.png (FR) / __287-32572.png (AR)
 *   - partner/Profile-My-company-information__277-40012.png (FR add sheet) / __287-40105.png (AR)
 *
 * Cards: Siège social, Infos société, Données bancaires ("Demande de modification ✎" → support).
 * Brands I sell: search, brand rows (logo + name + ⊗), "Ajouter ＋" bottom sheet with a
 * "Marque" dropdown and a sticky CTA. Specializations are brand ids only (no part-type split).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { getBrands, getCategoryTree, getPrestataireCompany, updatePrestataireCompany } from '@/api';
import Button from '@/components/common/Button';
import CustomHeader from '@/components/common/CustomHeader';
import Icon from '@/components/common/Icon';
import PickerInput from '@/components/common/PickerInput';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import View from '@/components/common/View';
import Colors from '@/constants/Colors';
import { usePartnerBadges } from '@/hooks/usePartnerBadges';
import type { CompanyBrand, CompanyBrandGroupKey, PrestataireCompany } from '@/interfaces/PrestataireCompany';
import type { CategoryFamily } from '@/interfaces/Category';
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
      <View flexDirection="row" alignItems="center" gap={8} style={styles.cardHeader}>
        <Text type="subTitle" color={Colors.brand} translate={false} flex style={styles.cardTitle}>{title}</Text>
        <TouchableOpacity style={styles.supportButton} onPress={onSupport} accessibilityRole="button" accessibilityLabel={`${supportLabel} ${title}`}>
          <View flexDirection="row" alignItems="center" gap={10}>
            <Text type="labelTwo" semiBold color={Colors.brand} translate={false}>{supportLabel}</Text>
            <Icon name="edit-2" size={16} iconColor={Colors.brand} type="Feather" />
          </View>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

function DataLine({ label, value }: { label: string; value?: string | null }): React.ReactElement | null {
  const { t } = useTranslation();
  return value
    ? <Text type="default" color={Colors.grayDark} translate={false} style={styles.dataLine}>{t('partner.company.dataLine', { label, value })}</Text>
    : null;
}

/** Brand logo, or a grey initial badge when the brand has no logo or it fails to load. */
function BrandLogo({ brand, label }: { brand?: Pick<CarBrand, 'logo'>; label: string }): React.ReactElement {
  const [failed, setFailed] = useState(false);
  if (brand?.logo && !failed) {
    return <Image source={{ uri: brand.logo }} style={styles.brandLogo} resizeMode="contain" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[styles.brandLogo, styles.brandLogoFallback]} alignItems="center" justifyContent="center">
      <Text type="textTwo" semiBold color={Colors.grayMidDark} translate={false}>{label.charAt(0).toLocaleUpperCase()}</Text>
    </View>
  );
}

export default function CompanyScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { hasUnreadNotifications } = usePartnerBadges();
  const [company, setCompany] = useState<PrestataireCompany | null>(null);
  const [brands, setBrands] = useState<CarBrand[]>([]);
  const [partFamilies, setPartFamilies] = useState<CategoryFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<CompanyBrandGroupKey>('mecanique');
  const [selectedRelatedPartIds, setSelectedRelatedPartIds] = useState<number[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<CompanyBrandGroupKey, boolean>>({ mecanique: true, carrosserie: false });

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [companyResponse, brandsResponse, categoriesResponse] = await Promise.all([
        getPrestataireCompany(),
        getBrands(),
        getCategoryTree(),
      ]);
      setCompany(companyResponse.data);
      setBrands(brandsResponse.data.filter((brand) => brand.status));
      setPartFamilies(categoriesResponse.data.map(({ id, title, titleAr }) => ({ id, title, titleAr })));
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
  const groups = company?.brandGroups ?? [];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const brandItems = useMemo(
    () => brands.map((brand) => ({ id: brand.id, title: labelFor(brand.id) })),
    [brands, labelFor],
  );
  const selectedBrandItem = brandItems.find((item) => item.id === selectedBrandId);

  const showSupport = (section: string) => Alert.alert(
    t('partner.company.modifyRequestTitle'),
    t('partner.company.modifyRequestBody', { section }),
    [{ text: t('Fermer'), style: 'cancel' }],
  );

  const saveBrandGroups = async (nextGroups: PrestataireCompany['brandGroups']): Promise<boolean> => {
    setSaving(true);
    try {
      const response = await updatePrestataireCompany({
        brandGroups: nextGroups.map((group) => ({
          group: group.group,
          brands: group.brands.map((brand) => ({ id: brand.id, relatedPartIds: brand.relatedParts.map((part) => part.id) })),
        })),
      });
      setCompany(response.data);
      return true;
    } catch {
      Alert.alert(t('partner.company.saveError'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const closeSheet = () => {
    setPickerOpen(false);
    setSelectedBrandId(null);
    setSelectedRelatedPartIds([]);
  };

  const addBrand = async () => {
    if (!selectedBrandId) return;
    if (groups.some((group) => group.group === selectedGroup && group.brands.some((brand) => brand.id === selectedBrandId))) {
      Alert.alert(t('partner.company.brandAlreadyAdded'));
      return;
    }
    const nextGroups = [...groups];
    const index = nextGroups.findIndex((group) => group.group === selectedGroup);
    const catalogBrand = brandById.get(selectedBrandId);
    if (!catalogBrand) return;
    const nextBrand: CompanyBrand = {
      id: catalogBrand.id,
      name: catalogBrand.name,
      nameAr: catalogBrand.nameAr ?? catalogBrand.name,
      logo: catalogBrand.logo,
      relatedParts: partFamilies.filter((part) => selectedRelatedPartIds.includes(part.id)),
    };
    if (index >= 0) nextGroups[index] = { ...nextGroups[index]!, brands: [...nextGroups[index]!.brands, nextBrand] };
    else nextGroups.push({ group: selectedGroup, brands: [nextBrand] });
    if (await saveBrandGroups(nextGroups)) closeSheet();
  };

  const confirmRemove = (groupKey: CompanyBrandGroupKey, brandId: number) => Alert.alert(
    t('partner.company.removeBrandTitle'),
    t('partner.company.removeBrandBody'),
    [
      { text: t('Annuler'), style: 'cancel' },
      {
        text: t('partner.company.removeBrandConfirm'),
        style: 'destructive',
        onPress: () => { void saveBrandGroups(groups.map((group) => group.group === groupKey
          ? { ...group, brands: group.brands.filter((brand) => brand.id !== brandId) }
          : group)); },
      },
    ],
  );

  const hasAddress = [company?.addressLine1, company?.addressLine2, company?.city, company?.region]
    .some((value) => Boolean(value?.trim()));
  const displayGroups = (['mecanique', 'carrosserie'] as const).map((group) => ({
    group,
    brands: (groups.find((entry) => entry.group === group)?.brands ?? []).filter((brand) =>
      [brand.name, brand.nameAr].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))),
  }));

  const header = <CustomHeader title={t('partner.company.title')} showNotifications hasUnread={hasUnreadNotifications} />;

  if (loading) return <Screen statusBarStyle="dark-content" whatsapp={false} edges={['bottom']}>{header}<View flex alignItems="center" justifyContent="center"><ActivityIndicator color={Colors.primary} size="large" /></View></Screen>;
  if (error || !company) return (
    <Screen statusBarStyle="dark-content" whatsapp={false} edges={['bottom']}>{header}<View flex alignItems="center" justifyContent="center" p={24}>
      <Text type="label" color={Colors.grayMidDark} center>{t('partner.company.loadError')}</Text>
      <Button title={t('partner.company.retry')} onPress={() => { void load(); }} style={styles.retry} />
    </View></Screen>
  );

  return (
    <Screen statusBarStyle="dark-content" whatsapp scrollable={false} edges={['bottom']}>
      {header}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SectionCard title={t('partner.company.sectionAddress')} supportLabel={t('partner.company.modifyRequest')} onSupport={() => showSupport(t('partner.company.sectionAddress'))}>
          {hasAddress ? (
            <>
              <DataLine label={t('partner.company.street')} value={company.addressLine1} />
              <DataLine label={t('partner.company.addressExtra')} value={company.addressLine2} />
              <DataLine label={t('partner.company.city')} value={company.city} />
              <DataLine label={t('partner.company.region')} value={company.region} />
            </>
          ) : (
            <Text type="default" color={Colors.gray} style={styles.dataLine}>{t('partner.company.addressEmpty')}</Text>
          )}
        </SectionCard>
        <SectionCard title={t('partner.company.sectionInfo')} supportLabel={t('partner.company.modifyRequest')} onSupport={() => showSupport(t('partner.company.sectionInfo'))}>
          <DataLine label="ICE" value={company.ice} />
          <DataLine label="RC" value={company.rc} />
          <DataLine label={t('partner.company.legalForm')} value={company.legalForm} />
          <DataLine label={t('partner.company.taxId')} value={company.taxId} />
          <DataLine label={t('partner.company.legalName')} value={company.legalName} />
        </SectionCard>
        <SectionCard title={t('partner.company.sectionBank')} supportLabel={t('partner.company.modifyRequest')} onSupport={() => showSupport(t('partner.company.sectionBank'))}>
          <DataLine label={t('partner.company.bankName')} value={company.bank.bankName} />
          <DataLine label={t('partner.company.bankRib')} value={company.bank.ibanMasked} />
          <DataLine label={t('partner.company.bankHolder')} value={company.bank.holder} />
          {!company.bank.bankName && !company.bank.ibanMasked && !company.bank.holder ? (
            <Text type="default" color={Colors.grayDark}>{t('partner.company.bankSupportOnly')}</Text>
          ) : null}
        </SectionCard>

        <View style={styles.brandsSection}>
          <View flexDirection="row" alignItems="center" gap={8} style={styles.brandsHeader}>
            <Text type="titleTwo" semiBold color={Colors.brand} translate={false} flex>{t('partner.company.sectionBrands')}</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setPickerOpen(true)} accessibilityRole="button" accessibilityLabel={t('partner.company.addBrandCta')}>
              <View flexDirection="row" alignItems="center" gap={10}>
                <Text type="textTwo" color={Colors.grayMidDark} translate={false}>{t('partner.company.addBrandCta')}</Text>
                <Icon name="plus" size={24} iconColor={Colors.brand} type="Feather" />
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.search} flexDirection="row" alignItems="center" gap={12}>
            <Icon name="search" size={22} iconColor={Colors.brand} type="Feather" />
            <RNTextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('partner.history.dotsPlaceholder')}
              placeholderTextColor={Colors.grayMidDark}
              accessibilityLabel={t('partner.history.searchLabel')}
              style={[styles.input, isArabic && styles.inputRtl]}
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={t('partner.search.clear')} style={styles.clearButton}>
                <Icon name="x-circle" size={22} iconColor={Colors.brand} type="Feather" />
              </TouchableOpacity>
            ) : null}
          </View>
          {displayGroups.map(({ group, brands: groupBrands }) => {
            const expanded = expandedGroups[group];
            return (
              <View key={group} style={styles.groupBlock}>
                <TouchableOpacity
                  onPress={() => setExpandedGroups((current) => ({ ...current, [group]: !current[group] }))}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityLabel={t(`partner.company.group.${group}`)}
                >
                  <View flexDirection="row" alignItems="center" gap={14} style={styles.groupHeader}>
                    <Icon name={expanded ? 'minus' : 'plus'} size={26} iconColor={Colors.brand} type="Feather" />
                    <Text type="subTitleTwo" semiBold color={Colors.brand}>{`partner.company.group.${group}`}</Text>
                  </View>
                </TouchableOpacity>
                {expanded ? groupBrands.map((brand) => {
                  const brandLabel = (isArabic ? brand.nameAr : brand.name) || brand.name;
                  const parts = brand.relatedParts.map((part) => isArabic ? part.titleAr || part.title : part.title).join(', ');
                  return (
                    <View key={brand.id} style={styles.brandRow} flexDirection="row" alignItems="center" gap={18}>
                      <BrandLogo brand={brand} label={brandLabel} />
                      <View flex gap={2}>
                        <Text type="textTwo" semiBold color={Colors.brand} translate={false}>{brandLabel}</Text>
                        {parts ? <Text type="small" color={Colors.grayMidDark} translate={false}>{t('partner.company.relatedParts', { parts })}</Text> : null}
                      </View>
                      <TouchableOpacity onPress={() => confirmRemove(group, brand.id)} disabled={saving} style={styles.clearButton} accessibilityRole="button" accessibilityLabel={t('partner.company.removeBrandAccessibility', { brand: brandLabel })}>
                        <Icon name="x-circle" size={24} iconColor={Colors.brand} type="Feather" />
                      </TouchableOpacity>
                    </View>
                  );
                }) : null}
              </View>
            );
          })}
          {normalizedQuery && displayGroups.every((group) => group.brands.length === 0) ? (
            <Text type="label" color={Colors.gray} center style={styles.empty}>{t('partner.company.noBrandResults')}</Text>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={closeSheet}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} onPress={closeSheet} activeOpacity={1} accessibilityRole="button" accessibilityLabel={t('Fermer')} />
          <View style={styles.sheet}>
            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <View style={styles.handle} />
              <Text type="subTitleTwo" semiBold color={Colors.brand} translate={false} style={styles.sheetTitle}>{t('partner.company.sheetTitle')}</Text>
              <PickerInput
                label={t('partner.company.sheetBrandLabel')}
                items={brandItems}
                selectedItem={selectedBrandItem}
                onSelectItem={(item) => setSelectedBrandId(item.id)}
                placeholder={t('partner.company.sheetBrandPlaceholder')}
                searchable={brandItems.length > 8}
                fillColor={Colors.backgroundLight}
                placeholderColor={Colors.grayMidDark}
                chevronColor={Colors.brand}
              />
              <PickerInput
                label={t('partner.company.sheetGroupLabel')}
                items={[
                  { id: 1, title: t('partner.company.group.mecanique') },
                  { id: 2, title: t('partner.company.group.carrosserie') },
                ]}
                selectedItem={{ id: selectedGroup === 'mecanique' ? 1 : 2, title: t(`partner.company.group.${selectedGroup}`) }}
                onSelectItem={(item) => setSelectedGroup(item.id === 1 ? 'mecanique' : 'carrosserie')}
                fillColor={Colors.backgroundLight}
                chevronColor={Colors.brand}
              />
              <Text type="default" color={Colors.brand} style={styles.partsLabel}>partner.company.sheetPartsLabel</Text>
              <View flexDirection="row" style={styles.partsWrap}>
                {partFamilies.map((part) => {
                  const selected = selectedRelatedPartIds.includes(part.id);
                  const label = (isArabic ? part.titleAr : part.title) || part.title;
                  return (
                    <TouchableOpacity
                      key={part.id}
                      style={[styles.partChip, selected && styles.partChipSelected]}
                      onPress={() => setSelectedRelatedPartIds((current) => selected
                        ? current.filter((id) => id !== part.id)
                        : [...current, part.id])}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={label}
                    >
                      <Text type="label" translate={false}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.stickyCta}>
              <Button
                title={saving ? t('partner.company.sheetSaving') : t('partner.company.sheetCta')}
                accessibilityLabel={t('partner.company.sheetCta')}
                onPress={() => { void addBrand(); }}
                disabled={saving || selectedBrandId === null || selectedRelatedPartIds.length === 0}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const shadow = Platform.select({
  ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { paddingBottom: 96 },
  card: { backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 16, borderRadius: 8, padding: 16, ...shadow },
  cardHeader: { marginBottom: 12 },
  cardTitle: { fontSize: 22 },
  supportButton: { minHeight: 44, justifyContent: 'center', flexShrink: 1, maxWidth: '55%' },
  dataLine: { lineHeight: 22 },
  brandsSection: { marginTop: 32, paddingHorizontal: 16 },
  brandsHeader: { marginBottom: 16 },
  addButton: { minHeight: 44, justifyContent: 'center' },
  search: { borderWidth: 1, borderColor: Colors.borderLight, backgroundColor: Colors.white, borderRadius: 8, paddingHorizontal: 14, minHeight: 52, marginBottom: 12 },
  input: { flex: 1, fontFamily: 'Roboto', fontSize: 16, color: Colors.brand, paddingVertical: Platform.OS === 'android' ? 6 : 10 },
  inputRtl: { textAlign: 'right', writingDirection: 'rtl' },
  clearButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: 16 },
  brandRow: { minHeight: 64 },
  groupBlock: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  groupHeader: { minHeight: 64 },
  brandLogo: { width: 48, height: 40 },
  brandLogoFallback: { width: 40, borderRadius: 20, backgroundColor: Colors.backgroundGray },
  retry: { marginTop: 16 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: Colors.backgroundLight, borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '75%', overflow: 'hidden' },
  sheetScroll: { flex: 1 },
  sheetContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  handle: { width: 120, height: 5, borderRadius: 3, backgroundColor: Colors.grayDark, alignSelf: 'center', marginBottom: 24 },
  sheetTitle: { marginBottom: 24, fontSize: 26, lineHeight: 32 },
  partsLabel: { marginTop: 16, marginBottom: 8 },
  partsWrap: { flexWrap: 'wrap', gap: 8 },
  partChip: { borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  partChipSelected: { borderColor: Colors.brand, backgroundColor: Colors.noticeUnread },
  stickyCta: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: Colors.white,
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 8 },
    }),
  },
});
