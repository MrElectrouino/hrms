import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import {
  Employee,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  getEmployee,
  getEmployees,
  createEmployee,
  updateEmployee,
  getDepartments,
  getSites,
  getShifts,
  getLanguages,
  getParameters,
  getEmployeeDependants,
  createEmployeeDependant,
  updateEmployeeDependant,
  deleteEmployeeDependant,
  getDocuments,
  createDocument,
  attachDocumentFile,
  downloadDocumentFile,
  getDocumentTypes,
  Dependant,
  Document,
  uploadEmployeePhoto,
} from '../../lib/api';
import EmployeePhoto from '../../components/EmployeePhoto';

type TabKey = 'personal' | 'work' | 'documents' | 'dependents';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'work', label: 'Work Info' },
  { key: 'documents', label: 'Documents' },
  { key: 'dependents', label: 'Dependents' },
];

export default function EmployeeDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, isLoading } = useAuth();

  const isNew = id === 'new';
  const employeeId = typeof id === 'string' && !isNew ? parseInt(id, 10) : undefined;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<CreateEmployeePayload & UpdateEmployeePayload>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    contactNo: '',
    dateOfBirth: '',
    maritalStatusId: undefined,
    genderId: undefined,
    bloodGroupId: undefined,
    nationalityId: undefined,
    visaTypeId: undefined,
    motherTongueId: undefined,
    address: '',
    homeCountryAddress: '',
    homeCountryPhoneNo: '',
    qualification: '',
    dateOfExit: '',
    exitReasonCode: undefined,
    employeeCode: '',
    reportingToId: undefined,
    sourceOfHireId: undefined,
    locationId: undefined,
    siteId: undefined,
    employeeStatusId: undefined,
    employeeTypeId: undefined,
    contractTypeId: undefined,
    workPhone: '',
    extension: '',
    workEmail: '',
    dateOfJoining: '',
    dateOfConfirmation: '',
    personIdNumber: '',
    designation: '',
    shiftId: undefined,
    departmentIds: [],
    isSiteAccess: false,
  });

  // Lookups
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [sites, setSites] = useState<{ id: number; name: string }[]>([]);
  const [shifts, setShifts] = useState<{ id: number; name: string }[]>([]);
  const [languages, setLanguages] = useState<{ id: number; name: string }[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<{ id: number; text: string }[]>([]);
  const [genders, setGenders] = useState<{ id: number; text: string }[]>([]);
  const [bloodGroups, setBloodGroups] = useState<{ id: number; text: string }[]>([]);
  const [sourceOfHires, setSourceOfHires] = useState<{ id: number; text: string }[]>([]);
  const [locations, setLocations] = useState<{ id: number; text: string }[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<{ id: number; text: string }[]>([]);
  const [employeeStatuses, setEmployeeStatuses] = useState<{ id: number; text: string }[]>([]);
  const [contractTypes, setContractTypes] = useState<{ id: number; text: string }[]>([]);
  const [exitReasons, setExitReasons] = useState<{ id: number; text: string }[]>([]);
  const [nationalities, setNationalities] = useState<{ id: number; text: string }[]>([]);
  const [visaTypes, setVisaTypes] = useState<{ id: number; text: string }[]>([]);
  const [reportingTos, setReportingTos] = useState<{ id: number; employeeCode: string; profile: { name: string; lastName?: string } }[]>([]);
  const [relationTypes, setRelationTypes] = useState<{ id: number; text: string }[]>([]);
  const [documentTypes, setDocumentTypes] = useState<{ id: number; name: string }[]>([]);

  // Documents & dependants
  const [documents, setDocuments] = useState<Document[]>([]);
  const [dependants, setDependants] = useState<Dependant[]>([]);
  const [newDependant, setNewDependant] = useState({ firstName: '', lastName: '', relationTypeId: '', dateOfBirth: '' });
  const [newDoc, setNewDoc] = useState({ documentTypeId: '', documentTitle: '', identityNo: '', issueDate: '', expiryDate: '', remarks: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Photo picked on the Add page; uploaded right after the employee is created.
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);

  // Add Employee now uses the full nine-section profile form.
  useEffect(() => {
    if (router.isReady && isNew) router.replace('/employee-profile/new');
  }, [router, isNew]);

  useEffect(() => {
    if (!isAuthenticated || !router.isReady || isNew) return;
    loadLookups();
    if (isNew) {
      setLoading(false);
      return;
    }
    if (employeeId) loadEmployee(employeeId);
  }, [isAuthenticated, router.isReady, id]);

  const loadLookups = async () => {
    try {
      const [
        d,
        s,
        sh,
        l,
        ms,
        g,
        bg,
        nat,
        vt,
        soh,
        loc,
        et,
        es,
        ct,
        er,
        emps,
        rt,
        dt,
      ] = await Promise.all([
        getDepartments({ isActive: true }),
        getSites(),
        getShifts(),
        getLanguages(),
        getParameters('Marital Status'),
        getParameters('Gender'),
        getParameters('BloodGroup'),
        getParameters('Nationality'),
        getParameters('Visa Type'),
        getParameters('Source of hire'),
        getParameters('Location'),
        getParameters('Employee Type'),
        getParameters('Employee Status'),
        getParameters('Contract Type'),
        getParameters('ExitReason'),
        getEmployees({ isActive: true, pageSize: 100 }),
        getParameters('Dependant Relation'),
        getDocumentTypes(),
      ]);
      setDepartments(d.data);
      setSites(s.data);
      setShifts(sh.data);
      setLanguages(l.data);
      setMaritalStatuses(ms.data);
      setGenders(g.data);
      setBloodGroups(bg.data);
      setNationalities(nat.data);
      setVisaTypes(vt.data);
      setSourceOfHires(soh.data);
      setLocations(loc.data);
      setEmployeeTypes(et.data);
      setEmployeeStatuses(es.data);
      setContractTypes(ct.data);
      setExitReasons(er.data);
      setReportingTos(emps.data);
      setRelationTypes(rt.data);
      setDocumentTypes(dt.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load lookups');
    }
  };

  const loadEmployee = async (eid: number) => {
    setLoading(true);
    try {
      const res = await getEmployee(eid);
      const emp = res.data;
      setEmployee(emp);
      setForm({
        firstName: emp.profile?.name || '',
        middleName: emp.profile?.middleName || '',
        lastName: emp.profile?.lastName || '',
        email: emp.profile?.email || '',
        contactNo: emp.profile?.contactNo || '',
        dateOfBirth: formatDateInput(emp.profile?.dateOfBirth),
        maritalStatusId: emp.profile?.maritalStatusId,
        genderId: emp.profile?.genderId,
        bloodGroupId: emp.profile?.bloodGroupId,
        nationalityId: emp.profile?.nationalityId,
        visaTypeId: emp.profile?.visaTypeId,
        motherTongueId: emp.profile?.motherTongueId,
        address: emp.profile?.address || '',
        homeCountryAddress: emp.profile?.homeCountryAddress || '',
        homeCountryPhoneNo: emp.profile?.homeCountryPhoneNo || '',
        qualification: emp.profile?.qualification || '',
        dateOfExit: formatDateInput(emp.profile?.dateOfExit),
        exitReasonCode: emp.profile?.exitReasonCode,
        employeeCode: emp.employeeCode || '',
        reportingToId: emp.reportingToId,
        sourceOfHireId: emp.sourceOfHireId,
        locationId: emp.locationId,
        siteId: emp.siteId,
        employeeStatusId: emp.employeeStatusId,
        employeeTypeId: emp.employeeTypeId,
        contractTypeId: emp.contractTypeId,
        workPhone: emp.workPhone || '',
        extension: emp.extension || '',
        workEmail: emp.workEmail || '',
        dateOfJoining: formatDateInput(emp.dateOfJoining),
        dateOfConfirmation: formatDateInput(emp.dateOfConfirmation),
        personIdNumber: emp.personIdNumber || '',
        designation: emp.designation || '',
        shiftId: emp.shiftId,
        departmentIds: emp.profile?.departments?.map((d) => d.departmentId) || [],
        isSiteAccess: emp.profile?.isSiteAccess || false,
      });
      await loadDocuments(emp.profileId);
      await loadDependants(eid);
    } catch (err: any) {
      setError(err.message || 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (profileId: number) => {
    try {
      const res = await getDocuments({ profileId, pageSize: 100 });
      setDocuments(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    }
  };

  const loadDependants = async (eid: number) => {
    try {
      const res = await getEmployeeDependants(eid);
      setDependants(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dependants');
    }
  };

  const handleChange = (field: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDepartment = (deptId: number) => {
    setForm((prev) => ({
      ...prev,
      departmentIds: prev.departmentIds?.includes(deptId)
        ? prev.departmentIds.filter((d) => d !== deptId)
        : [...(prev.departmentIds || []), deptId],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = sanitizePayload(form);
      if (isNew) {
        const created = await createEmployee(payload as CreateEmployeePayload);
        // A photo picked before creation is uploaded once the employee exists.
        let photoFailed = false;
        if (pendingPhoto) {
          try {
            await uploadEmployeePhoto(created.data.id, pendingPhoto);
          } catch {
            photoFailed = true;
          }
        }
        // The full profile is the default view of an employee.
        router.replace(photoFailed ? `/employee-profile/${created.data.id}?photoError=1` : `/employee-profile/${created.data.id}`);
      } else if (employeeId) {
        await updateEmployee(employeeId, payload);
        setError('');
        if (employeeId) await loadEmployee(employeeId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDependant = async () => {
    if (!employeeId) return;
    try {
      await createEmployeeDependant(employeeId, {
        firstName: newDependant.firstName,
        lastName: newDependant.lastName,
        relationTypeId: newDependant.relationTypeId ? parseInt(newDependant.relationTypeId, 10) : undefined,
        dateOfBirth: newDependant.dateOfBirth || undefined,
      });
      setNewDependant({ firstName: '', lastName: '', relationTypeId: '', dateOfBirth: '' });
      await loadDependants(employeeId);
    } catch (err: any) {
      setError(err.message || 'Failed to add dependant');
    }
  };

  const handleDeleteDependant = async (dependantId: number) => {
    if (!employeeId || !confirm('Delete this dependant?')) return;
    try {
      await deleteEmployeeDependant(employeeId, dependantId);
      await loadDependants(employeeId);
    } catch (err: any) {
      setError(err.message || 'Failed to delete dependant');
    }
  };

  const handleAddDocument = async () => {
    if (!employee) return;
    try {
      const created = await createDocument({
        profileId: employee.profileId,
        documentTypeId: parseInt(newDoc.documentTypeId, 10),
        documentTitle: newDoc.documentTitle || undefined,
        identityNo: newDoc.identityNo || undefined,
        issueDate: newDoc.issueDate || undefined,
        expiryDate: newDoc.expiryDate || undefined,
        remarks: newDoc.remarks || undefined,
        isSelf: false,
      });
      if (selectedFile) {
        await attachDocumentFile(created.data.id, selectedFile);
      }
      setNewDoc({ documentTypeId: '', documentTitle: '', identityNo: '', issueDate: '', expiryDate: '', remarks: '' });
      setSelectedFile(null);
      await loadDocuments(employee.profileId);
    } catch (err: any) {
      setError(err.message || 'Failed to add document');
    }
  };

  const handleViewFile = async (docId: number, fileId: number, fileName: string) => {
    try {
      const url = await downloadDocumentFile(docId, fileId);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to download file');
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ').trim();
  const initials = (((form.firstName || '')[0] ?? '') + ((form.lastName || '')[0] ?? '')).toUpperCase() || '+';
  const siteName = sites.find((s) => s.id === form.siteId)?.name;
  const typeName = employeeTypes.find((t) => t.id === form.employeeTypeId)?.text;
  const statusName = employeeStatuses.find((t) => t.id === form.employeeStatusId)?.text;
  const managerName = (() => {
    const m = reportingTos.find((e) => e.id === form.reportingToId);
    return m ? `${m.profile?.name ?? ''} ${m.profile?.lastName ?? ''}`.trim() : undefined;
  })();
  const sectionMeta: Record<TabKey, { title: string; description: string }> = {
    personal: { title: 'Personal', description: 'Identity, contact and address details.' },
    work: { title: 'Work', description: 'Employee code, joining, site, shift, reporting line and departments.' },
    documents: { title: 'Documents', description: 'Passport, visa, Emirates ID and other documents with expiry dates.' },
    dependents: { title: 'Dependents', description: 'Family members linked to this employee.' },
  };
  const navGroups: { group: string; items: TabKey[] }[] = [
    { group: 'Profile', items: ['personal'] },
    { group: 'Work', items: ['work'] },
    { group: 'Records', items: ['documents', 'dependents'] },
  ];
  const meta = sectionMeta[activeTab];

  return (
    <div className="space-y-5">
      {/* Breadcrumb + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
          <Link href="/employees" className="hover:text-gray-700">
            Employees
          </Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="font-medium text-gray-900">{isNew ? 'Add employee' : fullName || 'Employee'}</span>
        </nav>
        <div className="ml-auto flex gap-2">
          <Link href="/employees" className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            Back to list
          </Link>
        </div>
      </div>

      {/* Employee header card (mockup) */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-5">
          <EmployeePhoto
            employeeId={employeeId}
            initials={initials}
            canEdit
            hasPhoto={!!(employee as any)?.profile?.photoFileId}
            onStage={setPendingPhoto}
          />
          <div className="min-w-[220px] flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{fullName || (isNew ? 'New employee' : 'Employee')}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span className="font-mono">{form.employeeCode || 'Code not set'}</span>
              {form.designation && (<><span>·</span><span>{form.designation}</span></>)}
              {isNew ? (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">New</span>
              ) : (
                <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">{statusName || 'Active'}</span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-200 pt-4 md:grid-cols-5">
          {[
            ['Site', siteName],
            ['Employee type', typeName],
            ['Joining date', form.dateOfJoining],
            ['Reporting manager', managerName],
            ['Work email', form.workEmail],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <p className="text-xs text-gray-500">{k}</p>
              <p className="truncate text-sm font-medium text-gray-900">{v || '—'}</p>
            </div>
          ))}
        </div>
      </section>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {router.query.photoError && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The employee was created, but the photo could not be uploaded. Use “Upload photo” to try again.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Section navigation (mockup left rail) */}
        <nav aria-label="Employee sections" className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm lg:sticky lg:top-6 lg:col-span-3 lg:self-start">
          {navGroups.map(({ group, items }) => (
            <div key={group}>
              <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group}</p>
              {items.map((key) => {
                const n = tabs.findIndex((t) => t.key === key) + 1;
                const active = activeTab === key;
                const disabled = isNew && (key === 'documents' || key === 'dependents');
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => setActiveTab(key)}
                    aria-current={active ? 'true' : undefined}
                    title={disabled ? 'Save the employee first' : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium ${
                      active ? 'bg-blue-50 text-blue-700' : disabled ? 'cursor-not-allowed text-gray-400' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className={`w-5 text-xs ${active ? 'text-blue-600' : 'text-gray-400'}`}>{String(n).padStart(2, '0')}</span>
                    <span className="flex-1">{sectionMeta[key].title}</span>
                    {disabled && <span className="text-[11px] font-normal text-gray-400">Save first</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Section panel */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-9">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-gray-900">{meta.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{meta.description}</p>
          </div>

          {activeTab === 'personal' && (
            <div className="space-y-7">
              <FormGroup title="Personal details">
                <Input label="First name" value={form.firstName} onChange={(v) => handleChange('firstName', v)} required />
                <Input label="Middle name" value={form.middleName || ''} onChange={(v) => handleChange('middleName', v)} />
                <Input label="Last name" value={form.lastName || ''} onChange={(v) => handleChange('lastName', v)} />
                <Input type="date" label="Date of birth" value={form.dateOfBirth || ''} onChange={(v) => handleChange('dateOfBirth', v)} />
                <Select label="Gender" value={form.genderId || ''} options={genders.map((p) => ({ value: p.id, label: p.text }))} onChange={(v) => handleChange('genderId', v ? parseInt(v, 10) : undefined)} />
                <Select label="Marital status" value={form.maritalStatusId || ''} options={maritalStatuses.map((p) => ({ value: p.id, label: p.text }))} onChange={(v) => handleChange('maritalStatusId', v ? parseInt(v, 10) : undefined)} />
                <Select label="Nationality" value={form.nationalityId || ''} options={nationalities.map((p) => ({ value: p.id, label: p.text }))} onChange={(v) => handleChange('nationalityId', v ? parseInt(v, 10) : undefined)} />
                <Select label="Blood group" value={form.bloodGroupId || ''} options={bloodGroups.map((p) => ({ value: p.id, label: p.text }))} onChange={(v) => handleChange('bloodGroupId', v ? parseInt(v, 10) : undefined)} />
                <Select label="Mother tongue" value={form.motherTongueId || ''} options={languages.map((l) => ({ value: l.id, label: l.name }))} onChange={(v) => handleChange('motherTongueId', v ? parseInt(v, 10) : undefined)} emptyHint="No languages yet. Add them in Masters → Languages." />
                <Select label="Visa type" value={form.visaTypeId || ''} options={visaTypes.map((p) => ({ value: p.id, label: p.text }))} onChange={(v) => handleChange('visaTypeId', v ? parseInt(v, 10) : undefined)} />
                <Input label="Qualification" value={form.qualification || ''} onChange={(v) => handleChange('qualification', v)} />
              </FormGroup>

              <FormGroup title="Contact">
                <Input type="email" label="Personal email" value={form.email || ''} onChange={(v) => handleChange('email', v)} />
                <Input type="tel" label="Contact number" value={form.contactNo || ''} onChange={(v) => handleChange('contactNo', v)} />
                <Input type="tel" label="Home country phone" value={form.homeCountryPhoneNo || ''} onChange={(v) => handleChange('homeCountryPhoneNo', v)} />
              </FormGroup>

              <FormGroup title="Address" cols={2}>
                <TextArea label="Present address" value={form.address || ''} onChange={(v) => handleChange('address', v)} />
                <TextArea label="Home country address" value={form.homeCountryAddress || ''} onChange={(v) => handleChange('homeCountryAddress', v)} />
              </FormGroup>
            </div>
          )}

          {activeTab === 'work' && (
            <div className="space-y-7">
              <FormGroup title="Employment">
                <Input label="Employee code" value={form.employeeCode} onChange={(v) => handleChange('employeeCode', v)} required mono />
                <Input label="Designation" value={form.designation || ''} onChange={(v) => handleChange('designation', v)} />
                <Input type="date" label="Date of joining" value={form.dateOfJoining} onChange={(v) => handleChange('dateOfJoining', v)} required />
                <Input type="date" label="Date of confirmation" value={form.dateOfConfirmation || ''} onChange={(v) => handleChange('dateOfConfirmation', v)} />
                <Select label="Employee type" value={form.employeeTypeId || ''} options={employeeTypes.map((p) => ({ value: p.id, label: p.text }))} onChange={(v) => handleChange('employeeTypeId', v ? parseInt(v, 10) : undefined)} />
                <Select label="Employee status" value={form.employeeStatusId || ''} options={employeeStatuses.map((p) => ({ value: p.id, label: p.text }))} onChange={(v) => handleChange('employeeStatusId', v ? parseInt(v, 10) : undefined)} />
                <Select label="Contract type" value={form.contractTypeId || ''} options={contractTypes.map((p) => ({ value: p.id, label: p.text }))} onChange={(v) => handleChange('contractTypeId', v ? parseInt(v, 10) : undefined)} />
                <Select label="Source of hire" value={form.sourceOfHireId || ''} options={sourceOfHires.map((p) => ({ value: p.id, label: p.text }))} onChange={(v) => handleChange('sourceOfHireId', v ? parseInt(v, 10) : undefined)} />
                <Input label="Person ID number" value={form.personIdNumber || ''} onChange={(v) => handleChange('personIdNumber', v)} mono hint="At least 14 characters (Emirates ID format)" />
              </FormGroup>

              <FormGroup title="Organization">
                <Select label="Site" value={form.siteId || ''} options={sites.map((s) => ({ value: s.id, label: s.name }))} onChange={(v) => handleChange('siteId', v ? parseInt(v, 10) : undefined)} />
                <Select label="Location" value={form.locationId || ''} options={locations.map((p) => ({ value: p.id, label: p.text }))} onChange={(v) => handleChange('locationId', v ? parseInt(v, 10) : undefined)} />
                <Select label="Shift" value={form.shiftId || ''} options={shifts.map((s) => ({ value: s.id, label: s.name }))} onChange={(v) => handleChange('shiftId', v ? parseInt(v, 10) : undefined)} />
                <Select label="Reporting to" value={form.reportingToId || ''} options={reportingTos.map((e) => ({ value: e.id, label: `${e.employeeCode} - ${e.profile?.name} ${e.profile?.lastName || ''}`.trim() }))} onChange={(v) => handleChange('reportingToId', v ? parseInt(v, 10) : undefined)} />
              </FormGroup>

              <FormGroup title="Work contact">
                <Input type="email" label="Work email" value={form.workEmail || ''} onChange={(v) => handleChange('workEmail', v)} />
                <Input type="tel" label="Work phone" value={form.workPhone || ''} onChange={(v) => handleChange('workPhone', v)} />
                <Input label="Extension" value={form.extension || ''} onChange={(v) => handleChange('extension', v)} />
              </FormGroup>

              <div>
                <GroupTitle>Departments</GroupTitle>
                {departments.length === 0 ? (
                  <p className="text-sm text-gray-500">No departments yet. Add them in Masters → Departments.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {departments.map((d) => {
                      const on = form.departmentIds?.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDepartment(d.id)}
                          aria-pressed={on}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${on ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                          {d.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <GroupTitle>System access</GroupTitle>
                <label className="flex items-center gap-2.5 text-sm text-gray-700">
                  <input type="checkbox" checked={form.isSiteAccess} onChange={(e) => handleChange('isSiteAccess', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  Grant site access (the employee can log in)
                </label>
              </div>

              <FormGroup title="Exit details">
                <Input type="date" label="Date of exit" value={form.dateOfExit || ''} onChange={(v) => handleChange('dateOfExit', v)} />
                <Select label="Exit reason" value={form.exitReasonCode || ''} options={exitReasons.map((p) => ({ value: p.id, label: p.text }))} onChange={(v) => handleChange('exitReasonCode', v ? parseInt(v, 10) : undefined)} />
              </FormGroup>
            </div>
          )}

          {activeTab === 'documents' && employee && (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <GroupTitle>Add document</GroupTitle>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Select label="Document type" required value={newDoc.documentTypeId} options={documentTypes.map((d) => ({ value: d.id, label: d.name }))} onChange={(v) => setNewDoc({ ...newDoc, documentTypeId: v })} />
                  <Input label="Document title" value={newDoc.documentTitle} onChange={(v) => setNewDoc({ ...newDoc, documentTitle: v })} />
                  <Input label="Identity / document no." value={newDoc.identityNo} onChange={(v) => setNewDoc({ ...newDoc, identityNo: v })} mono />
                  <Input type="date" label="Issue date" value={newDoc.issueDate} onChange={(v) => setNewDoc({ ...newDoc, issueDate: v })} />
                  <Input type="date" label="Expiry date" value={newDoc.expiryDate} onChange={(v) => setNewDoc({ ...newDoc, expiryDate: v })} />
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">Attachment</label>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50" />
                    <p className="mt-1 text-xs text-gray-400">JPG, PNG or PDF, up to 10 MB</p>
                  </div>
                  <div className="md:col-span-2 xl:col-span-3">
                    <Input label="Remarks" value={newDoc.remarks} onChange={(v) => setNewDoc({ ...newDoc, remarks: v })} />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={handleAddDocument} disabled={!newDoc.documentTypeId} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">Add document</button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Document</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Number</th>
                      <th className="px-4 py-3">Expiry</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Files</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {documents.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No documents yet.</td></tr>
                    ) : (
                      documents.map((doc) => (
                        <tr key={doc.id}>
                          <td className="px-4 py-3 font-medium text-gray-900">{doc.documentTitle || doc.documentType?.name}</td>
                          <td className="px-4 py-3 text-gray-700">{doc.documentType?.name}</td>
                          <td className="px-4 py-3 font-mono text-[13px] text-gray-700">{doc.identityNo || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '—'}</td>
                          <td className="px-4 py-3"><ExpiryPill date={doc.expiryDate} /></td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {doc.files?.length ? doc.files.map((f, idx) => (
                                <button key={idx} type="button" onClick={() => handleViewFile(doc.id, f.file.id, f.file.originalName)} className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100">
                                  {f.file.originalName}
                                </button>
                              )) : <span className="text-xs text-gray-400">No file</span>}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'dependents' && employee && (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <GroupTitle>Add dependent</GroupTitle>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Input label="First name" required value={newDependant.firstName} onChange={(v) => setNewDependant({ ...newDependant, firstName: v })} />
                  <Input label="Last name" value={newDependant.lastName} onChange={(v) => setNewDependant({ ...newDependant, lastName: v })} />
                  <Select label="Relation" value={newDependant.relationTypeId} options={relationTypes.map((p) => ({ value: p.id, label: p.text }))} onChange={(v) => setNewDependant({ ...newDependant, relationTypeId: v })} />
                  <Input type="date" label="Date of birth" value={newDependant.dateOfBirth} onChange={(v) => setNewDependant({ ...newDependant, dateOfBirth: v })} />
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={handleAddDependant} disabled={!newDependant.firstName} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">Add dependent</button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Relation</th>
                      <th className="px-4 py-3">Date of birth</th>
                      <th className="px-4 py-3 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dependants.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No dependents yet.</td></tr>
                    ) : (
                      dependants.map((dep) => (
                        <tr key={dep.id}>
                          <td className="px-4 py-3 font-medium text-gray-900">{dep.dependantProfile?.name} {dep.dependantProfile?.lastName}</td>
                          <td className="px-4 py-3 text-gray-700">{relationTypes.find((r) => r.id === dep.relationTypeId)?.text || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{dep.dependantProfile?.dateOfBirth ? new Date(dep.dependantProfile.dateOfBirth).toLocaleDateString() : '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => handleDeleteDependant(dep.id)} className="text-xs font-medium text-red-600 hover:text-red-800">Remove</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions (employee record fields: Personal and Work) */}
          {(activeTab === 'personal' || activeTab === 'work') && (
            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-5">
              <p className="text-sm text-gray-500">
                {isNew ? 'Fill in Personal and Work, then create the employee. Documents and dependents open after saving.' : 'Saves Personal and Work together.'}
              </p>
              <div className="ml-auto flex gap-2">
                <Link href="/employees" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                  Cancel
                </Link>
                <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
                  {saving ? 'Saving…' : isNew ? 'Create employee' : 'Save changes'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function sanitizePayload(form: CreateEmployeePayload & UpdateEmployeePayload): CreateEmployeePayload | UpdateEmployeePayload {
  const payload = { ...form };
  // Remove empty optional strings so backend doesn't receive ""
  (Object.keys(payload) as Array<keyof typeof payload>).forEach((k) => {
    const val = payload[k];
    if (typeof val === 'string' && val.trim() === '') {
      (payload as any)[k] = undefined;
    }
  });
  return payload;
}

function formatDateInput(value?: string | Date | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/* ---------------- form controls (UI guide: gray-300 border, rounded-lg, blue-500 focus ring) ---------------- */

const controlClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-gray-600">
      {label}
      {required && <span className="ml-0.5 text-red-600">*</span>}
    </label>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{children}</h4>;
}

function FormGroup({ title, children, cols = 3 }: { title: string; children: React.ReactNode; cols?: 2 | 3 }) {
  return (
    <div className="border-t border-gray-100 pt-5 first:border-t-0 first:pt-0">
      <GroupTitle>{title}</GroupTitle>
      <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${cols === 3 ? 'xl:grid-cols-3' : ''}`}>{children}</div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  required,
  mono,
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={`${controlClass} ${mono ? 'font-mono text-[13px]' : ''}`}
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <FieldLabel label={label} />
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={controlClass} />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  required,
  emptyHint,
}: {
  label: string;
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (value: string) => void;
  required?: boolean;
  /** Shown when the lookup has no values yet (e.g. an empty master). */
  emptyHint?: string;
}) {
  const empty = options.length === 0;
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <select value={value} required={required} onChange={(e) => onChange(e.target.value)} className={controlClass} disabled={empty}>
        <option value="">{empty ? 'No options available' : 'Select'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {empty && <p className="mt-1 text-xs text-amber-700">{emptyHint ?? 'No values yet. Add them in Masters.'}</p>}
    </div>
  );
}

function ExpiryPill({ date }: { date?: string | Date | null }) {
  if (!date) return <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-500">No expiry</span>;
  const days = Math.round((new Date(date).getTime() - Date.now()) / 864e5);
  if (days < 0) return <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">Expired</span>;
  if (days <= 60) return <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">Expires in {days} days</span>;
  return <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">Valid</span>;
}
