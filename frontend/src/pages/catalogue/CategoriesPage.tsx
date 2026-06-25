import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categorieService } from '../../services';

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nom: '', description: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: categories, isLoading } = useQuery({ queryKey: ['categories'], queryFn: categorieService.lister });

  const createMut = useMutation({ mutationFn: categorieService.creer,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setForm({ nom: '', description: '' }); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur') });

  const updateMut = useMutation({ mutationFn: ({ id, data }: any) => categorieService.modifier(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setEditId(null); setForm({ nom: '', description: '' }); },
    onError: (e: any) => setError(e.response?.data?.message || 'Erreur') });

  const deleteMut = useMutation({ mutationFn: categorieService.supprimer,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError: (e: any) => alert(e.response?.data?.message || 'Erreur') });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (editId) updateMut.mutate({ id: editId, data: form });
    else createMut.mutate(form);
  };

  return (
    <div className="page">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Catégories</h2>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">{editId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</div>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input className="form-control" value={form.nom}
                onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={2} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={createMut.isPending || updateMut.isPending}>
                {editId ? 'Mettre à jour' : 'Créer'}
              </button>
              {editId && <button type="button" className="btn btn-secondary"
                onClick={() => { setEditId(null); setForm({ nom: '', description: '' }); }}>Annuler</button>}
            </div>
          </form>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            {isLoading ? <div className="loading-center"><span className="spinner" /></div> : (
              <table>
                <thead><tr><th>Catégorie</th><th>Articles</th><th></th></tr></thead>
                <tbody>
                  {categories?.map(c => (
                    <tr key={c.id}>
                      <td><div className="font-bold">{c.nom}</div><div className="text-muted text-sm">{c.description}</div></td>
                      <td>{c.nb_articles ?? 0}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => { setEditId(c.id); setForm({ nom: c.nom, description: c.description || '' }); }}>
                            Modifier
                          </button>
                          <button className="btn btn-danger btn-sm"
                            onClick={() => { if(confirm('Supprimer ?')) deleteMut.mutate(c.id); }}>
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
