/**
 * (prestataire)/profile/company.tsx
 *
 * Informations sur l'entreprise — Sprint P5 sub-flow A.
 *
 * Figma refs:
 *   - partner/Profile-My-company-information__277-39544.png  (FR view)
 *   - partner/Profile-My-company-information__277-40012.png  (FR add-brand sheet)
 *   - partner/Profile-My-company-information__287-32572.png  (AR view)
 *   - partner/Profile-My-company-information__287-40105.png  (AR add-brand sheet)
 *
 * Sections (top → bottom):
 *   CustomHeader — back + "Informations sur l'entreprise"
 *   Siège social  — addressLine1/2, city, region.  "Demande de modification" action.
 *   Infos société — ICE, RC, taxId, legalName, legal form.  "Demande de modification"
 *   Données bancaires — placeholder bank block.  "Demande de modification"
 *   Marques que je vends — search bar + grouped specialization list with add (+) CTA
 *   Add-brand bottom sheet (modal) — marque picker + pièces picker + Ajouter button
 *
 * The "Demande de modification" action triggers a support alert (all fields are
 * admin-controlled once validated; the partner cannot self-edit core legal data).
 * Adding a brand (specializations) calls updatePrestataireCompany.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import CustomHeader from '@/components/common/CustomHeader';
import Icon from '@/components/common/Icon';
import CustomIcon from '@/components/common/CustomIcon';
import Button from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';

import {
  getPrestataireCompany,
  updatePrestataireCompany,
} from '@/api';
import type { PrestataireCompany } from '@/interfaces/PrestataireCompany';
import Colors from '@/constants/Colors';

// ─── Static data ──────────────────────────────────────────────────────────────

/** Mock brand names — real API would return car_brand entities. */
const BRAND_OPTIONS = [
  'BMW', 'Mercedes', 'Volkswagen', 'Renault', 'Dacia',
  'Peugeot', 'Citroën', 'Toyota', 'Hyundai', 'Kia',
  'Ford', 'Opel', 'Fiat', 'Seat', 'Nissan',
];

const PIECE_CATEGORIES = [
  'Mécanique', 'Carrosserie', 'Électrique', 'Intérieur',
];

// Brand id mapping (mock)
const BRAND_ID_MAP: Record<string, number> = {
  'BMW': 5, 'Mercedes': 6, 'Volkswagen': 4, 'Renault': 2,
  'Dacia': 1, 'Peugeot': 7, 'Citroën': 8, 'Toyota': 9,
  'Hyundai': 3, 'Kia': 10, 'Ford': 11, 'Opel': 12,
  'Fiat': 13, 'Seat': 14, 'Nissan': 15,
};

const BRAND_LABEL_MAP: Record<number, string> = Object.fromEntries(
  Object.entries(BRAND_ID_MAP).map(([label, id]) => [id, label]),
);

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SectionCardProps {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly onModifyPress: () => void;
  readonly modifyLabel: string;
}

function SectionCard({
  title,
  children,
  onModifyPress,
  modifyLabel,
}: SectionCardProps): React.ReactElement {
  return (
    <View style={styles.sectionCard}>
      <View flexDirection="row" alignItems="center" style={styles.cardHeader}>
        <Text type="subTitle" semiBold color={Colors.brand} flex>
          {title}
        </Text>
        <TouchableOpacity
          style={styles.modifyBtn}
          onPress={onModifyPress}
          activeOpacity={0.7}
        >
          <Text type="small" color={Colors.grayMidDark}>
            {modifyLabel}
          </Text>
          <Icon name="edit-2" size={14} iconColor={Colors.grayMidDark} type="Feather" />
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

interface DataLineProps {
  readonly label: string;
  readonly value: string | null | undefined;
}

function DataLine({ label, value }: DataLineProps): React.ReactElement | null {
  if (!value) return null;
  return (
    <View style={styles.dataLine}>
      <Text type="small" color={Colors.grayMidDark} translate={false}>
        {`${label}: ${value}`}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CompanyScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();

  const pageHeader = (
    <CustomHeader>
      <View flexDirection="row" alignItems="center" style={styles.pageHeaderRow}>
        <Text type="headerTitle" color={Colors.brand} flex>
          {'partner.company.title'}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(prestataire)/profile/notifications' as never)}
          accessibilityRole="button"
          accessibilityLabel={t('partner.notifications.title')}
        >
          <CustomIcon name="notif" size={27} />
        </TouchableOpacity>
      </View>
    </CustomHeader>
  );

  const [company, setCompany] = useState<PrestataireCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedPieces, setSelectedPieces] = useState<string>('');

  const loadCompany = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await getPrestataireCompany();
      if (res.data) setCompany(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompany();
  }, [loadCompany]);

  const handleModifyRequest = (section: string) => {
    Alert.alert(
      t('partner.company.modifyRequestTitle'),
      t('partner.company.modifyRequestBody', { section }),
      [{ text: t('Fermer'), style: 'cancel' }],
    );
  };

  const handleAddBrand = async () => {
    if (!selectedBrand) {
      Alert.alert(t('partner.company.selectBrandRequired'));
      return;
    }
    if (!company) return;
    const brandId = BRAND_ID_MAP[selectedBrand];
    if (!brandId) return;
    const current = company.specializations ?? [];
    if (current.includes(brandId)) {
      Alert.alert(t('partner.company.brandAlreadyAdded'));
      return;
    }
    try {
      setSaving(true);
      const updated = [...current, brandId];
      const res = await updatePrestataireCompany({ specializations: updated });
      if (res.data) setCompany(res.data);
      setSheetVisible(false);
      setSelectedBrand('');
      setSelectedPieces('');
    } catch {
      Alert.alert(t('partner.company.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBrand = async (brandId: number) => {
    if (!company) return;
    Alert.alert(
      t('partner.company.removeBrandTitle'),
      t('partner.company.removeBrandBody'),
      [
        { text: t('Annuler'), style: 'cancel' },
        {
          text: t('partner.company.removeBrandConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const updated = (company.specializations ?? []).filter(
                (id) => id !== brandId,
              );
              const res = await updatePrestataireCompany({ specializations: updated });
              if (res.data) setCompany(res.data);
            } catch {
              Alert.alert(t('partner.company.saveError'));
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const currentBrandIds: number[] = company?.specializations ?? [];

  // Group brand ids by piece category label (mock: all grouped under first letter)
  const brandsByGroup: Record<string, number[]> = {};
  currentBrandIds.forEach((id) => {
    const label = BRAND_LABEL_MAP[id] ?? `#${id}`;
    const group = label[0].toUpperCase();
    if (!brandsByGroup[group]) brandsByGroup[group] = [];
    brandsByGroup[group].push(id);
  });

  // ── Loading / error ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Screen whatsapp={false}>
        {pageHeader}
        <View flex alignItems="center" justifyContent="center">
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (error || !company) {
    return (
      <Screen whatsapp={false}>
        {pageHeader}
        <View flex alignItems="center" justifyContent="center" p={24}>
          <Text type="label" color={Colors.grayMidDark} center>
            {t('partner.company.loadError')}
          </Text>
          <Button
            title={t('partner.company.retry')}
            onPress={() => loadCompany()}
            style={styles.retryBtn}
          />
        </View>
      </Screen>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Screen whatsapp scrollable={false}>
      {pageHeader}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Siège social ── */}
        <SectionCard
          title={t('partner.company.sectionAddress')}
          modifyLabel={t('partner.company.modifyRequest')}
          onModifyPress={() => handleModifyRequest(t('partner.company.sectionAddress'))}
        >
          {company.addressLine1 ? (
            <Text type="label" color={Colors.brand} translate={false} style={styles.cardBodyText}>
              {`${t('partner.company.street')}: ${company.addressLine1}`}
            </Text>
          ) : null}
          {company.addressLine2 ? (
            <Text type="label" color={Colors.brand} translate={false} style={styles.cardBodyText}>
              {company.addressLine2}
            </Text>
          ) : null}
          {company.city ? (
            <Text type="label" color={Colors.brand} translate={false} style={styles.cardBodyText}>
              {`${t('partner.company.city')}: ${company.city}`}
            </Text>
          ) : null}
          {company.region ? (
            <Text type="label" color={Colors.brand} translate={false} style={styles.cardBodyText}>
              {`${t('partner.company.region')}: ${company.region}`}
            </Text>
          ) : null}
        </SectionCard>

        {/* ── Infos société ── */}
        <SectionCard
          title={t('partner.company.sectionInfo')}
          modifyLabel={t('partner.company.modifyRequest')}
          onModifyPress={() => handleModifyRequest(t('partner.company.sectionInfo'))}
        >
          <DataLine label="ICE" value={company.ice} />
          <DataLine label="RC" value={company.rc} />
          <DataLine label="Tax ID" value={company.taxId} />
          <DataLine
            label={t('partner.company.legalName')}
            value={company.legalName}
          />
        </SectionCard>

        {/* ── Données bancaires ── */}
        <SectionCard
          title={t('partner.company.sectionBank')}
          modifyLabel={t('partner.company.modifyRequest')}
          onModifyPress={() => handleModifyRequest(t('partner.company.sectionBank'))}
        >
          <Text type="label" color={Colors.grayMidDark} style={styles.cardBodyText}>
            {t('partner.company.bankPlaceholder')}
          </Text>
        </SectionCard>

        {/* ── Marques que je vends ── */}
        <View style={styles.brandsSection}>
          <View flexDirection="row" alignItems="center" style={styles.brandsHeader}>
            <Text type="subTitle" semiBold color={Colors.brand} flex>
              {t('partner.company.sectionBrands')}
            </Text>
            <TouchableOpacity
              style={styles.addBrandBtn}
              onPress={() => setSheetVisible(true)}
              activeOpacity={0.7}
            >
              <Text type="label" color={Colors.grayMidDark}>
                {t('partner.company.addBrandCta')}
              </Text>
              <Icon name="plus" size={18} iconColor={Colors.brand} type="Feather" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar} flexDirection="row" alignItems="center" gap={8}>
            <Icon name="search" size={16} iconColor={Colors.gray} type="Feather" />
            <RNTextInput
              style={styles.searchInput}
              placeholder={t('partner.company.searchPlaceholder')}
              placeholderTextColor={Colors.gray}
              value={brandSearch}
              onChangeText={setBrandSearch}
            />
          </View>

          {/* Brand list — grouped */}
          {currentBrandIds.length === 0 ? (
            <Text type="label" color={Colors.gray} style={styles.emptyBrands}>
              {t('partner.company.noBrands')}
            </Text>
          ) : (
            Object.entries(brandsByGroup)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([group, ids]) => {
                const filtered = ids.filter((id) => {
                  const label = BRAND_LABEL_MAP[id] ?? '';
                  return label
                    .toLowerCase()
                    .includes(brandSearch.toLowerCase());
                });
                if (filtered.length === 0) return null;
                return (
                  <View key={group} style={styles.brandGroup}>
                    <View style={styles.brandGroupDivider} flexDirection="row" alignItems="center" gap={8}>
                      <View style={styles.groupLine} />
                      <Text type="small" color={Colors.grayMidDark} translate={false}>
                        {group}
                      </Text>
                    </View>
                    {filtered.map((id) => {
                      const label = BRAND_LABEL_MAP[id] ?? `#${id}`;
                      return (
                        <View key={id} style={styles.brandRow} flexDirection="row" alignItems="center">
                          <View style={styles.brandIconPlaceholder} />
                          <View flex style={styles.brandInfo}>
                            <Text type="label" semiBold color={Colors.brand} translate={false}>
                              {label}
                            </Text>
                            <Text type="small" color={Colors.gray}>
                              {t('partner.company.brandPiecesPlaceholder')}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleRemoveBrand(id)}
                            disabled={saving}
                            activeOpacity={0.7}
                          >
                            <Icon
                              name="x-circle"
                              size={20}
                              iconColor={Colors.gray}
                              type="Feather"
                            />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                );
              })
          )}
        </View>
      </ScrollView>

      {/* ── Add Brand bottom sheet ── */}
      <Modal
        visible={sheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSheetVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={() => setSheetVisible(false)}
            activeOpacity={1}
          />
          <View style={styles.sheet}>
            {/* Drag handle */}
            <View style={styles.sheetHandle} />

            <Text type="subTitle" semiBold color={Colors.brand} style={styles.sheetTitle}>
              {t('partner.company.sheetTitle')}
            </Text>

            {/* Marque picker */}
            <Text type="small" color={Colors.grayMidDark} style={styles.sheetLabel}>
              {t('partner.company.sheetBrandLabel')}
            </Text>
            <ScrollView
              style={styles.sheetPickerScroll}
              showsVerticalScrollIndicator={false}
            >
              {BRAND_OPTIONS.map((brand) => (
                <TouchableOpacity
                  key={brand}
                  style={[
                    styles.sheetPickerItem,
                    selectedBrand === brand && styles.sheetPickerItemActive,
                  ]}
                  onPress={() => setSelectedBrand(brand)}
                  activeOpacity={0.7}
                >
                  <Text
                    type="label"
                    color={
                      selectedBrand === brand ? Colors.brand : Colors.grayMidDark
                    }
                    translate={false}
                  >
                    {brand}
                  </Text>
                  {selectedBrand === brand ? (
                    <Icon name="check" size={16} iconColor={Colors.primary} type="Feather" />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Pièces picker */}
            <Text type="small" color={Colors.grayMidDark} style={styles.sheetLabel}>
              {t('partner.company.sheetPiecesLabel')}
            </Text>
            <View style={styles.sheetPiecesRow} flexDirection="row" gap={8}>
              {PIECE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.pieceChip,
                    selectedPieces === cat && styles.pieceChipActive,
                  ]}
                  onPress={() =>
                    setSelectedPieces((prev) => (prev === cat ? '' : cat))
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    type="small"
                    color={
                      selectedPieces === cat ? Colors.brand : Colors.grayMidDark
                    }
                    translate={false}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Ajouter CTA */}
            <Button
              title={saving ? t('partner.company.sheetSaving') : t('partner.company.sheetCta')}
              onPress={handleAddBrand}
              disabled={saving || !selectedBrand}
              style={styles.sheetCta}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pageHeaderRow: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 5,
    padding: 16,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 10,
  },
  modifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardBodyText: {
    marginBottom: 4,
  },
  dataLine: {
    marginBottom: 4,
  },
  brandsSection: {
    backgroundColor: Colors.backgroundLight,
    marginTop: 24,
    padding: 16,
  },
  brandsHeader: {
    marginBottom: 12,
  },
  addBrandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchBar: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Roboto',
    fontSize: 14,
    color: Colors.brand,
    padding: 0,
  },
  emptyBrands: {
    paddingVertical: 16,
    textAlign: 'center',
  },
  brandGroup: {
    marginBottom: 8,
  },
  brandGroupDivider: {
    marginBottom: 8,
  },
  groupLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
    flex: 1,
  },
  brandRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },
  brandIconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundGray,
  },
  brandInfo: {
    gap: 2,
  },
  retryBtn: {
    marginTop: 16,
  },
  // Sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    marginBottom: 16,
  },
  sheetLabel: {
    marginBottom: 6,
  },
  sheetPickerScroll: {
    maxHeight: 180,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
  },
  sheetPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  sheetPickerItemActive: {
    backgroundColor: Colors.backgroundGray,
  },
  sheetPiecesRow: {
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  pieceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.backgroundGray,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pieceChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sheetCta: {
    marginTop: 4,
  },
});
