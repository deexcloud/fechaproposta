import { useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Autocomplete, Box, Button, Stack, TextField, Typography, createFilterOptions } from '@mui/material';
import { UserPlus } from 'lucide-react';
import { NameAvatar } from '@/components/visual';
import { useClients } from '@/hooks/queries';
import { formatPhone } from '@/lib/format';
import type { Client } from '@/types';
import type { EditorValues } from './schema';
import { tokens } from '@/theme/tokens';

type Option = Client | { id: '__new__'; name: string };
const filter = createFilterOptions<Option>({ stringify: (o) => ('company' in o ? `${o.name} ${o.company ?? ''} ${o.email ?? ''}` : o.name) });

/** Escolhe um cliente cadastrado ou cadastra um novo sem sair da proposta. */
export function ClientPicker() {
  const clients = useClients();
  const { control, setValue, register, formState } = useFormContext<EditorValues>();
  const clientId = useWatch({ control, name: 'clientId' });
  const creating = useWatch({ control, name: 'creatingClient' });
  const [input, setInput] = useState('');
  const selected = clients.data?.find((c) => c.id === clientId) ?? null;
  const errors = formState.errors;

  if (creating) {
    return (
      <Box sx={{ p: 2, borderRadius: '12px', bgcolor: tokens.muted }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 650 }}>Novo cliente</Typography>
          <Button size="small" color="inherit" onClick={() => setValue('creatingClient', false, { shouldDirty: true })}>Escolher cadastrado</Button>
        </Stack>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField label="Nome *" size="small" autoFocus {...register('newClient.name')} error={Boolean(errors.newClient?.name)} helperText={errors.newClient?.name?.message} />
          <TextField label="Empresa" size="small" {...register('newClient.company')} />
          <TextField label="WhatsApp" size="small" placeholder="(11) 98888-7777" slotProps={{ htmlInput: { inputMode: 'tel' } }} {...register('newClient.whatsapp')} error={Boolean(errors.newClient?.whatsapp)} helperText={errors.newClient?.whatsapp?.message ?? 'Para enviar e lembrar pelo WhatsApp'} />
          <TextField label="E-mail" size="small" type="email" {...register('newClient.email')} error={Boolean(errors.newClient?.email)} helperText={errors.newClient?.email?.message} />
        </Box>
      </Box>
    );
  }

  if (selected) {
    return (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.5, borderRadius: '12px', border: `1px solid ${tokens.border}` }}>
        <NameAvatar name={selected.name} size={40} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 600 }}>{selected.name}{selected.company ? ` · ${selected.company}` : ''}</Typography>
          <Typography noWrap variant="caption" color="text.secondary">
            {[selected.whatsapp && formatPhone(selected.whatsapp), selected.email].filter(Boolean).join(' · ') || 'Sem contato cadastrado'}
          </Typography>
        </Box>
        <Button size="small" variant="outlined" onClick={() => setValue('clientId', null, { shouldDirty: true })}>Trocar</Button>
      </Stack>
    );
  }

  return (
    <Controller
      control={control}
      name="clientId"
      render={({ fieldState }) => (
        <Autocomplete<Option>
          options={clients.data ?? []}
          loading={clients.isPending}
          inputValue={input}
          onInputChange={(_, v) => setInput(v)}
          getOptionLabel={(o) => o.name}
          filterOptions={(options, params) => {
            const found = filter(options, params);
            const typed = params.inputValue.trim();
            if (typed && !found.some((o) => o.name.toLowerCase() === typed.toLowerCase())) found.push({ id: '__new__', name: typed });
            if (!typed && found.length === 0) found.push({ id: '__new__', name: '' });
            return found;
          }}
          onChange={(_, option) => {
            if (!option) return;
            if (option.id === '__new__') {
              setValue('newClient', { name: option.name, company: '', email: '', whatsapp: '' }, { shouldDirty: true });
              setValue('creatingClient', true, { shouldDirty: true });
            } else {
              setValue('clientId', option.id, { shouldDirty: true, shouldValidate: true });
            }
          }}
          renderOption={({ key, ...props }, o) =>
            o.id === '__new__' ? (
              <li key={key} {...props}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', color: tokens.accentText, fontWeight: 600 }}>
                  <UserPlus size={16} />
                  <span>{o.name ? `Cadastrar “${o.name}”` : 'Cadastrar novo cliente'}</span>
                </Stack>
              </li>
            ) : (
              <li key={key} {...props}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
                  <NameAvatar name={o.name} size={28} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap variant="body2" sx={{ fontWeight: 550 }}>{o.name}</Typography>
                    {'company' in o && o.company && <Typography noWrap variant="caption" color="text.secondary">{o.company}</Typography>}
                  </Box>
                </Stack>
              </li>
            )
          }
          noOptionsText="Digite o nome para cadastrar"
          renderInput={(params) => (
            <TextField {...params} label="Cliente" placeholder="Busque ou digite um nome novo" error={Boolean(fieldState.error)} helperText={fieldState.error?.message} />
          )}
        />
      )}
    />
  );
}
