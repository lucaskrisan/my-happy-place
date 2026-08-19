import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Save, Plus } from 'lucide-react';

export const Route = createFileRoute('/notas')({
  component: NotasPage,
  head: () => ({
    title: 'Minhas Notas | Central de Produção',
    meta: [
      { name: 'description', content: 'Bloco de notas simples para organizar a produção.' },
    ],
  }),
});

function NotasPage() {
  const [notes, setNotes] = useState<{ id: string; text: string; date: string }[]>([]);
  const [currentNote, setCurrentNote] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('prod_notes');
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao carregar notas', e);
      }
    }
  }, []);

  const saveNotes = (newNotes: typeof notes) => {
    setNotes(newNotes);
    localStorage.setItem('prod_notes', JSON.stringify(newNotes));
  };

  const addNote = () => {
    if (!currentNote.trim()) return;
    const newNote = {
      id: Date.now().toString(),
      text: currentNote,
      date: new Date().toLocaleString('pt-BR'),
    };
    saveNotes([newNote, ...notes]);
    setCurrentNote('');
  };

  const deleteNote = (id: string) => {
    saveNotes(notes.filter((n) => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bloco de Notas</h1>
            <p className="text-zinc-400 mt-2">Central de anotações da produção</p>
          </div>
          <Button 
            variant="outline" 
            asChild
            className="border-white/10 hover:bg-white/5"
          >
            <a href="/dev">Voltar ao Painel</a>
          </Button>
        </header>

        <section className="space-y-4">
          <Textarea
            placeholder="O que você está fazendo agora? Digite aqui..."
            className="min-h-[150px] bg-zinc-900/50 border-white/10 focus:border-blue-500/50 transition-all text-lg resize-none"
            value={currentNote}
            onChange={(e) => setCurrentNote(e.target.value)}
          />
          <div className="flex justify-end">
            <Button 
              onClick={addNote}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6"
            >
              <Plus className="w-4 h-4" />
              Salvar Nota
            </Button>
          </div>
        </section>

        <div className="grid gap-4">
          {notes.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl">
              <p className="text-zinc-500 italic">Nenhuma nota salva ainda.</p>
            </div>
          ) : (
            notes.map((note) => (
              <Card key={note.id} className="bg-zinc-900/30 border-white/5 p-6 hover:border-white/10 transition-colors group">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <p className="text-zinc-400 text-xs font-mono">{note.date}</p>
                    <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed">{note.text}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNote(note.id)}
                    className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
