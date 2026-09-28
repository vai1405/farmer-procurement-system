import { useCallback, useEffect, useState } from 'react';

import ErrorMessage from '../../components/common/ErrorMessage';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { getErrorMessage } from '../../services/api';
import { farmerService } from '../../services/farmerService';
import { formatDateTime } from '../../utils/formatters';

/**
 * Farmer profile view and edit form.
 *
 * Starts in read-only mode; "Edit Profile" switches the same fields into
 * editable inputs. Email is displayed but never editable, because it is
 * part of the login identity.
 */
const Profile = () => {
  usePageTitle('My Profile');
  const fetchProfile = useCallback(() => farmerService.getProfile(), []);
  const { data: profile, isLoading, error, refetch, setData } = useFetch(fetchProfile);

  const { setUser } = useAuth();
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Seed the form whenever fresh profile data arrives.
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
        village: profile.village ?? '',
        district: profile.district ?? '',
        state: profile.state ?? '',
      });
    }
  }, [profile]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormError('');
    // Reset any unsaved edits.
    setForm({
      full_name: profile.full_name ?? '',
      phone: profile.phone ?? '',
      address: profile.address ?? '',
      village: profile.village ?? '',
      district: profile.district ?? '',
      state: profile.state ?? '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.full_name.trim().length < 3) {
      setFormError('Full name must be at least 3 characters long.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setFormError('');
    setIsSaving(true);

    try {
      const updated = await farmerService.updateProfile(form);
      setData(updated);
      // Keep the navbar/sidebar name in sync with the saved value.
      setUser((current) =>
        current ? { ...current, full_name: updated.full_name, phone: updated.phone } : current,
      );
      setIsEditing(false);
      toast.success('Profile updated successfully.');
    } catch (saveError) {
      setFormError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !profile) {
    return <Loader message="Loading your profile..." fullPage={false} />;
  }

  if (error && !profile) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  if (!form) return null;

  const fields = [
    { name: 'full_name', label: 'Full Name', type: 'text', col: 'col-md-6' },
    { name: 'phone', label: 'Phone Number', type: 'tel', col: 'col-md-6', maxLength: 10 },
    { name: 'address', label: 'Address', type: 'text', col: 'col-12' },
    { name: 'village', label: 'Village', type: 'text', col: 'col-md-4' },
    { name: 'district', label: 'District', type: 'text', col: 'col-md-4' },
    { name: 'state', label: 'State', type: 'text', col: 'col-md-4' },
  ];

  return (
    <div>
      <PageHeader title="My Profile" subtitle="View and update your details">
        {!isEditing && (
          <button className="btn btn-agri" onClick={() => setIsEditing(true)}>
            Edit Profile
          </button>
        )}
      </PageHeader>

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm text-center">
            <div className="card-body py-4">
              <div
                className="sidebar-avatar bg-agri mx-auto mb-3"
                style={{ width: 80, height: 80, fontSize: '2rem' }}
              >
                {profile.full_name?.charAt(0)?.toUpperCase()}
              </div>
              <h5 className="fw-bold mb-1">{profile.full_name}</h5>
              <p className="text-muted small mb-2">{profile.email}</p>
              <span className="badge bg-agri">{profile.role}</span>

              <hr />
              <div className="small text-muted text-start">
                <div className="d-flex justify-content-between mb-1">
                  <span>Member since</span>
                  <span>{formatDateTime(profile.created_at)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Last updated</span>
                  <span>{formatDateTime(profile.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom fw-semibold py-3">
              {isEditing ? 'Edit Details' : 'Profile Details'}
            </div>

            <div className="card-body">
              {formError && (
                <div className="alert alert-danger py-2">{formError}</div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="row g-3">
                  {fields.map((field) => (
                    <div key={field.name} className={field.col}>
                      <label htmlFor={field.name} className="form-label fw-medium">
                        {field.label}
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        maxLength={field.maxLength}
                        className="form-control"
                        value={form[field.name]}
                        onChange={handleChange}
                        disabled={!isEditing}
                        readOnly={!isEditing}
                      />
                    </div>
                  ))}

                  <div className="col-md-6">
                    <label className="form-label fw-medium">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={profile.email}
                      disabled
                      readOnly
                    />
                    <div className="form-text">
                      Email cannot be changed as it is used to sign in.
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="d-flex gap-2 mt-4">
                    <button type="submit" className="btn btn-agri" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;